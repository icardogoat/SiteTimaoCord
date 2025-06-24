
'use server';

import clientPromise from '@/lib/mongodb';
import type { PlacedBet, Transaction } from '@/types';
import { ObjectId, WithId } from 'mongodb';
import { revalidatePath } from 'next/cache';

// Base type for a match in the DB (for admin list view)
type MatchFromDb = {
  _id: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  timestamp: number;
  status: string;
  isProcessed?: boolean;
};

// Types for data structure inside a full match document from DB
// Assumed to be saved by an external script, mirroring API structure
interface TeamDataInDB {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
}

interface StatsInDB {
    team: { id: number; };
    statistics: { type: string; value: number | string | null; }[];
}

// Type for the full match document in MongoDB
type FullMatchInDb = MatchFromDb & {
    goals: { home: number | null; away: number | null; };
    teams: TeamDataInDB;
    statistics: StatsInDB[];
};

type MatchAdminView = {
    id: string;
    fixtureId: number;
    teamA: string;
    teamB: string;
    league: string;
    time: string;
    status: string;
    isProcessed: boolean;
};

type UserAdminView = {
    id: string;
    name: string;
    email: string;
    discordId: string;
    joinDate: string;
    totalBets: number;
    totalWagered: number;
    balance: number;
    status: "Ativo" | "Suspenso";
    avatar: string;
};

type BetAdminView = {
    id: string;
    userName: string;
    userEmail: string;
    matchDescription: string;
    selections: string;
    stake: number;
    potentialWinnings: number;
    status: 'Em Aberto' | 'Ganha' | 'Perdida' | 'Cancelada';
};


// Fetch matches for admin page
export async function getAdminMatches(): Promise<MatchAdminView[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const matchesCollection = db.collection<MatchFromDb>('matches');
        
        // Find all matches and sort by timestamp descending
        const matchesFromDb = await matchesCollection.find({}).sort({ 'timestamp': -1 }).limit(100).toArray();

        const matches = matchesFromDb.map(match => {
            // Add a check for incomplete data to prevent crashes
            if (!match?._id || !match?.homeTeam || !match?.awayTeam) {
                return null;
            }
            
            let statusLabel: string;
            if (match.isProcessed) {
                statusLabel = 'Pago';
            } else {
                switch (match.status) {
                    case 'FT':
                    case 'AET':
                    case 'PEN':
                        statusLabel = 'Pendente Pagamento';
                        break;
                    case 'NS':
                        statusLabel = 'Agendada';
                        break;
                    default:
                        statusLabel = 'Ao Vivo';
                }
            }


            return {
                id: match._id.toString(),
                fixtureId: match._id,
                teamA: match.homeTeam,
                teamB: match.awayTeam,
                league: match.league,
                time: new Date(match.timestamp * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                status: statusLabel,
                isProcessed: match.isProcessed ?? false,
            };
        });
        
        // Filter out any null values from malformed data
        return matches.filter((match): match is MatchAdminView => match !== null);

    } catch (error) {
        console.error("Error fetching admin matches:", error);
        return [];
    }
}

// Fetch bets for admin page
export async function getAdminBets(): Promise<BetAdminView[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        
        const bets = await db.collection('bets').aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            { $sort: { createdAt: -1 } }
        ]).toArray();

        return bets.map((bet: any) => ({
            id: bet._id.toString(),
            userName: bet.userDetails.name,
            userEmail: bet.userDetails.email,
            matchDescription: bet.bets.length > 1 
                ? `${bet.bets.length} seleções` 
                : `${bet.bets[0].teamA} vs ${bet.bets[0].teamB}`,
            selections: bet.bets.map((s: any) => `${s.selection} @ ${s.oddValue}`).join(', '),
            stake: bet.stake,
            potentialWinnings: bet.potentialWinnings,
            status: bet.status
        }));

    } catch (error) {
        console.error("Error fetching admin bets:", error);
        return [];
    }
}

// Fetch users for admin page
export async function getAdminUsers(): Promise<UserAdminView[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');

        const users = await db.collection('users').aggregate([
            {
                $lookup: {
                    from: 'wallets',
                    localField: 'discordId',
                    foreignField: 'userId',
                    as: 'walletInfo'
                }
            },
            {
                $unwind: {
                    path: '$walletInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
             {
                $lookup: {
                    from: 'bets',
                    localField: 'discordId',
                    foreignField: 'userId',
                    as: 'betInfo'
                }
            },
            {
                $addFields: {
                    totalBets: { $size: '$betInfo' },
                    totalWagered: { $sum: '$betInfo.stake' },
                    balance: { $ifNull: ['$walletInfo.balance', 0] },
                    joinDate: { $ifNull: ['$createdAt', new Date()] },
                }
            },
            {
                $project: {
                    betInfo: 0,
                    walletInfo: 0,
                    accounts: 0,
                    sessions: 0,
                    emailVerified: 0
                }
            }
        ]).toArray();
        
        return users.map((user: any) => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            discordId: user.discordId,
            joinDate: (user.joinDate as Date).toISOString().split('T')[0],
            totalBets: user.totalBets,
            totalWagered: user.totalWagered,
            balance: user.balance,
            status: "Ativo", // Assuming status logic would be more complex
            avatar: user.image || `https://placehold.co/40x40.png`,
        }));
    } catch (error) {
        console.error("Error fetching admin users:", error);
        return [];
    }
}

// Function to evaluate one selection
function evaluateSelection(selection: PlacedBet['bets'][0], goals: { home: number, away: number }, stats: StatsInDB[], teams: TeamDataInDB): 'Ganha' | 'Perdida' | 'Anulada' {
    const { home, away } = goals;
    const totalGoals = home + away;
    
    const homeStats = stats.find(s => s.team.id === teams.home.id)?.statistics || [];
    const awayStats = stats.find(s => s.team.id === teams.away.id)?.statistics || [];
    
    const getStat = (teamStats: { type: string; value: any }[], type: string): number => {
        const stat = teamStats.find(s => s.type === type);
        const value = stat ? stat.value : 0;
        return Number(value) || 0;
    }
    
    const homeCorners = getStat(homeStats, 'Corner Kicks');
    const awayCorners = getStat(awayStats, 'Corner Kicks');
    const totalCorners = homeCorners + awayCorners;

    const homeYellow = getStat(homeStats, 'Yellow Cards');
    const homeRed = getStat(homeStats, 'Red Cards');
    const awayYellow = getStat(awayStats, 'Yellow Cards');
    const awayRed = getStat(awayStats, 'Red Cards');
    const totalCards = homeYellow + homeRed + awayYellow + awayRed;
    
    switch (selection.marketName) {
        case 'Vencedor da Partida':
            if (selection.selection === 'Casa' && home > away) return 'Ganha';
            if (selection.selection === 'Empate' && home === away) return 'Ganha';
            if (selection.selection === 'Fora' && away > home) return 'Ganha';
            return 'Perdida';
        
        case 'Aposta sem Empate':
            if (selection.selection === 'Casa' && home > away) return 'Ganha';
            if (selection.selection === 'Fora' && away > home) return 'Ganha';
            if (home === away) return 'Anulada';
            return 'Perdida';

        case 'Gols Acima/Abaixo':
        case 'Escanteios Acima/Abaixo':
        case 'Cartões Acima/Abaixo': {
            let valueToCompare;
            if (selection.marketName.includes('Gols')) valueToCompare = totalGoals;
            else if (selection.marketName.includes('Escanteios')) valueToCompare = totalCorners;
            else valueToCompare = totalCards;

            const [condition, valueStr] = selection.selection.split(' ');
            const value = parseFloat(valueStr);
            if (condition === 'Acima') {
                if (valueToCompare > value) return 'Ganha';
                if (valueToCompare === value) return 'Anulada';
            }
            if (condition === 'Abaixo') {
                if (valueToCompare < value) return 'Ganha';
                if (valueToCompare === value) return 'Anulada';
            }
            return 'Perdida';
        }

        case 'Ambos Marcam':
            if (selection.selection === 'Sim' && home > 0 && away > 0) return 'Ganha';
            if (selection.selection === 'Não' && (home === 0 || away === 0)) return 'Ganha';
            return 'Perdida';
        
        case 'Placar Exato':
            const [homeScore, awayScore] = selection.selection.split('-').map(Number);
            if (home === homeScore && away === awayScore) return 'Ganha';
            return 'Perdida';
            
        case 'Dupla Chance':
            if (selection.selection === 'Casa ou Empate' && home >= away) return 'Ganha';
            if (selection.selection === 'Fora ou Empate' && away >= home) return 'Ganha';
            if (selection.selection === 'Casa ou Fora' && home !== away) return 'Ganha';
            return 'Perdida';

        case 'Total de Gols da Casa':
        case 'Total de Gols do Visitante':
        case 'Escanteios da Casa Acima/Abaixo':
        case 'Escanteios do Visitante Acima/Abaixo': {
             let valueToCompare;
            if (selection.marketName.includes('Casa')) {
                valueToCompare = selection.marketName.includes('Gols') ? home : homeCorners;
            } else { // Visitante
                valueToCompare = selection.marketName.includes('Gols') ? away : awayCorners;
            }
            const [condition, valueStr] = selection.selection.split(' ');
            const value = parseFloat(valueStr);
            if (condition === 'Acima') {
                if (valueToCompare > value) return 'Ganha';
                if (valueToCompare === value) return 'Anulada';
            }
            if (condition === 'Abaixo') {
                if (valueToCompare < value) return 'Ganha';
                if (valueToCompare === value) return 'Anulada';
            }
            return 'Perdida';
        }

        case 'Escanteios 1x2':
            if (selection.selection === 'Casa' && homeCorners > awayCorners) return 'Ganha';
            if (selection.selection === 'Empate' && homeCorners === awayCorners) return 'Ganha';
            if (selection.selection === 'Fora' && awayCorners > homeCorners) return 'Ganha';
            return 'Perdida';
            
        default:
            console.warn(`Market not handled for resolution: ${selection.marketName}`);
            return 'Perdida';
    }
}

// Main action to resolve a match and settle bets
export async function resolveMatch(fixtureId: number): Promise<{ success: boolean; message: string }> {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const matchesCollection = db.collection<FullMatchInDb>('matches');

    try {
        const matchData = await matchesCollection.findOne({ _id: fixtureId });

        if (!matchData) {
            return { success: false, message: `Partida ${fixtureId} não encontrada no banco de dados.` };
        }

        if (matchData.isProcessed) {
            return { success: true, message: `Partida ${fixtureId} já foi processada anteriormente.` };
        }

        if (matchData.status !== 'FT') {
            return { success: false, message: `A partida ${fixtureId} ainda não foi finalizada (Status: ${matchData.status}).` };
        }

        const { goals, statistics: finalStats, teams } = matchData;

        if (goals.home === null || goals.away === null) {
            return { success: false, message: 'Dados de gols ausentes no documento da partida.' };
        }

        if (!finalStats || !teams) {
            return { success: false, message: 'Dados de estatísticas ou de times estão ausentes no documento da partida.' };
        }

        const mongoSession = client.startSession();
        let settledCount = 0;

        await mongoSession.withTransaction(async () => {
            const betsCollection = db.collection<WithId<PlacedBet>>('bets');
            const walletsCollection = db.collection('wallets');

            // Mark as processed inside the transaction
            await matchesCollection.updateOne(
                { '_id': fixtureId },
                { $set: { isProcessed: true } },
                { session: mongoSession }
            );

            const openBets = await betsCollection.find({ 
                'bets.matchId': fixtureId,
                status: 'Em Aberto' 
            }, { session: mongoSession }).toArray();

            for (const bet of openBets) {
                const updatedSelections = bet.bets.map(selection => {
                    if (selection.matchId === fixtureId) {
                        return { ...selection, status: evaluateSelection(selection, goals, finalStats, teams) };
                    }
                    return selection;
                });
                
                const allSelectionsSettled = updatedSelections.every(s => s.status && s.status !== 'Em Aberto');
                
                if (allSelectionsSettled) {
                    const isBetLost = updatedSelections.some(s => s.status === 'Perdida');
                    const finalBetStatus = isBetLost ? 'Perdida' : 'Ganha';
                    
                    let winnings = 0;
                    if (finalBetStatus === 'Ganha') {
                        const finalOdds = updatedSelections.reduce((acc, sel) => {
                            if (sel.status === 'Anulada') return acc * 1;
                            return acc * parseFloat(sel.oddValue);
                        }, 1);
                        winnings = bet.stake * finalOdds;

                         const newTransaction: Transaction = {
                            id: new ObjectId().toString(),
                            type: 'Prêmio',
                            description: `Ganhos da aposta #${bet._id.toString().substring(18)}`,
                            amount: winnings,
                            date: new Date().toISOString(),
                            status: 'Concluído',
                        };

                        await walletsCollection.updateOne(
                            { userId: bet.userId },
                            {
                                $inc: { balance: winnings },
                                $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
                            },
                            { session: mongoSession }
                        );
                    }
                    
                    await betsCollection.updateOne(
                        { _id: bet._id },
                        { $set: { bets: updatedSelections, status: finalBetStatus, potentialWinnings: winnings, settledAt: new Date() } },
                        { session: mongoSession }
                    );
                    settledCount++;
                } else {
                     await betsCollection.updateOne(
                        { _id: bet._id },
                        { $set: { bets: updatedSelections } },
                        { session: mongoSession }
                    );
                }
            }
        });
        
        await mongoSession.endSession();

        revalidatePath('/admin/matches');
        revalidatePath('/admin/bets');
        revalidatePath('/my-bets');
        revalidatePath('/wallet');

        return { success: true, message: `Partida ${fixtureId} resolvida. ${settledCount} apostas foram finalizadas.` };

    } catch (error) {
        console.error(`Error resolving match ${fixtureId}:`, error);
        return { success: false, message: 'Ocorreu um erro inesperado ao processar a resolução.' };
    }
}

// Function to be called by a cron job to process all finished matches
export async function processAllFinishedMatches(): Promise<{ success: boolean; message: string; details: string[] }> {
    console.log('Starting to process finished matches...');
    const client = await clientPromise;
    const db = client.db('timaocord');
    const matchesCollection = db.collection('matches');

    const finishedMatchesToProcess = await matchesCollection.find({
        'status': 'FT',
        'isProcessed': { $ne: true }
    }).toArray();

    if (finishedMatchesToProcess.length === 0) {
        console.log('No new finished matches to process.');
        return { success: true, message: 'No new finished matches to process.', details: [] };
    }

    console.log(`Found ${finishedMatchesToProcess.length} matches to process.`);
    const results: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const match of finishedMatchesToProcess) {
        const fixtureId = match._id; 
        console.log(`Processing match ${fixtureId}...`);
        try {
            const result = await resolveMatch(fixtureId);
            if (result.success) {
                successCount++;
                results.push(`Successfully resolved match ${fixtureId}: ${result.message}`);
            } else {
                failureCount++;
                results.push(`Failed to resolve match ${fixtureId}: ${result.message}`);
            }
        } catch (error) {
            failureCount++;
            const errorMessage = (error instanceof Error) ? error.message : String(error);
            results.push(`Error processing match ${fixtureId}: ${errorMessage}`);
            console.error(`Error processing match ${fixtureId}:`, error);
        }
    }

    const summaryMessage = `Processed ${finishedMatchesToProcess.length} matches. Success: ${successCount}, Failure: ${failureCount}.`;
    console.log(summaryMessage);
    
    return {
        success: failureCount === 0,
        message: summaryMessage,
        details: results
    };
}

    
