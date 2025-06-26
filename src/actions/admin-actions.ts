
'use server';

import clientPromise from '@/lib/mongodb';
import type { PlacedBet, Transaction, UserRanking, MvpVoting, MvpPlayer, MvpTeamLineup, Notification, StoreItem } from '@/types';
import { ObjectId, WithId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getBotConfig } from './bot-config-actions';
import { grantAchievement } from './achievement-actions';
import { getApiSettings, getAvailableApiKey } from './settings-actions';

// Base type for a match in the DB (for admin list view)
type MatchFromDb = {
  _id: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  timestamp: number;
  status: string;
  isProcessed?: boolean;
  isNotificationSent?: boolean;
  homeLogo?: string;
  awayLogo?: string;
};

// Types for data structure inside a full match document from DB
// These are expected from the external script that saves API data
interface TeamDataInDB {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
}

interface StatsInDB {
    team: { id: number; };
    statistics: { type: string; value: number | string | null; }[];
}

// Type for the full match document in MongoDB, acknowledging some fields might be missing
type FullMatchInDb = MatchFromDb & {
    goals: { home: number | null; away: number | null; };
    statistics?: StatsInDB[];
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
    hasBolao: boolean;
    bolaoId?: string;
    hasMvpVoting: boolean;
    mvpVotingId?: string;
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
    isVip?: boolean;
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

// Types for dashboard data
export type DashboardStats = {
    totalWagered: number;
    activeUsers: number;
    totalBets: number;
    grossProfit: number;
};

export type WeeklyBetVolume = {
    date: string;
    total: number;
}[];

export type TopBettor = {
    name: string;
    email: string;
    avatar: string;
    totalWagered: number;
    isVip?: boolean;
};

export type RecentBet = {
    userName: string;
    userEmail: string;
    matchDescription: string;
    status: 'Em Aberto' | 'Ganha' | 'Perdida' | 'Cancelada';
    stake: number;
};

// Helper function to send a win notification to a Discord channel
async function sendWinNotification(bet: WithId<PlacedBet>, user: UserRanking, winnings: number) {
    const config = await getBotConfig();
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!config.winnersChannelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        if (!config.winnersChannelId) console.log('Winners channel not configured. Skipping Discord notification.');
        if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') console.log('Bot token not configured. Skipping Discord notification.');
        return;
    }

    const betDescription = bet.bets.length > 1
        ? `Múltipla (${bet.bets.length} seleções)`
        : `${bet.bets[0].teamA} vs ${bet.bets[0].teamB}`;

    const embed = {
        color: 0x22c55e, // Tailwind's green-500
        title: '🏆 Aposta Vencedora! 🏆',
        author: {
            name: user.name,
            icon_url: user.avatar,
        },
        fields: [
            { name: 'Aposta', value: betDescription, inline: false },
            { name: 'Valor Apostado', value: `R$ ${bet.stake.toFixed(2)}`, inline: true },
            { name: 'Prêmio Recebido', value: `**R$ ${winnings.toFixed(2)}**`, inline: true },
        ],
        footer: {
            text: 'Parabéns ao vencedor! 🎉',
        },
        timestamp: new Date().toISOString(),
    };

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${config.winnersChannelId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${botToken}`,
            },
            body: JSON.stringify({ embeds: [embed] }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send win notification to Discord:', JSON.stringify(errorData, null, 2));
        } else {
            console.log(`Successfully sent win notification for user ${user.name}`);
        }
    } catch (error) {
        console.error('Error sending win notification to Discord:', error);
    }
}

// Fetch matches for admin page
export async function getAdminMatches(): Promise<MatchAdminView[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const matchesCollection = db.collection<MatchFromDb>('matches');
        const boloesCollection = db.collection('boloes');
        const mvpVotingsCollection = db.collection('mvp_votings');

        const activeBoloes = await boloesCollection.find({ status: 'Aberto' }).project({ matchId: 1, _id: 1 }).toArray();
        const bolaoMatchMap = new Map(activeBoloes.map(b => [b.matchId, b._id.toString()]));

        const activeVotings = await mvpVotingsCollection.find({}).project({ matchId: 1, _id: 1 }).toArray();
        const mvpMatchMap = new Map(activeVotings.map(v => [v.matchId, v._id.toString()]));
        
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
                    case 'PST':
                        statusLabel = 'Adiado';
                        break;
                    case 'HT':
                        statusLabel = 'Intervalo';
                        break;
                    case 'SUSP':
                        statusLabel = 'Paralizado';
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
                hasBolao: bolaoMatchMap.has(match._id),
                bolaoId: bolaoMatchMap.get(match._id),
                hasMvpVoting: mvpMatchMap.has(match._id),
                mvpVotingId: mvpMatchMap.get(match._id),
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
            isVip: user.isVip ?? false,
        }));
    } catch (error) {
        console.error("Error fetching admin users:", error);
        return [];
    }
}

// Function to evaluate one selection
function evaluateSelection(selection: PlacedBet['bets'][0], goals: { home: number, away: number }, stats: StatsInDB[] | undefined, teams: TeamDataInDB): 'Ganha' | 'Perdida' | 'Anulada' {
    const { home, away } = goals;
    const totalGoals = home + away;
    
    const marketsNeedingStats = [
        'Escanteios Acima/Abaixo', 'Cartões Acima/Abaixo', 'Escanteios 1x2',
        'Escanteios da Casa Acima/Abaixo', 'Escanteios do Visitante Acima/Abaixo',
    ];

    if (marketsNeedingStats.includes(selection.marketName) && (!stats || !teams)) {
        console.warn(`Market "${selection.marketName}" for match ${selection.matchId} will be voided due to missing statistics data.`);
        return 'Anulada';
    }
    
    let homeCorners = 0, awayCorners = 0, totalCorners = 0, totalCards = 0;

    if (stats && teams) {
        const homeStats = stats.find(s => s.team.id === teams.home.id)?.statistics || [];
        const awayStats = stats.find(s => s.team.id === teams.away.id)?.statistics || [];
        
        const getStat = (teamStats: { type: string; value: any }[], type: string): number => {
            const stat = teamStats.find(s => s.type === type);
            if (!stat || stat.value === null) return 0;
            const value = typeof stat.value === 'string' ? parseInt(stat.value, 10) : stat.value;
            return isNaN(value) ? 0 : Number(value);
        }
        
        homeCorners = getStat(homeStats, 'Corner Kicks');
        awayCorners = getStat(awayStats, 'Corner Kicks');
        totalCorners = homeCorners + awayCorners;

        const homeYellow = getStat(homeStats, 'Yellow Cards');
        const homeRed = getStat(homeStats, 'Red Cards');
        const awayYellow = getStat(awayStats, 'Yellow Cards');
        const awayRed = getStat(awayStats, 'Red Cards');
        totalCards = homeYellow + homeRed + awayYellow + awayRed;
    }
    
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
export async function resolveMatch(fixtureId: number, options: { revalidate: boolean } = { revalidate: true }): Promise<{ success: boolean; message: string }> {
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

        const { goals, statistics: finalStats } = matchData;

        if (goals.home === null || goals.away === null) {
            return { success: false, message: 'Dados de gols ausentes no documento da partida.' };
        }

        const getTeamIdFromLogo = (url: string | undefined): number | null => {
            if (!url) return null;
            const match = url.match(/\/teams\/(\d+)\.png$/);
            return match ? parseInt(match[1], 10) : null;
        };

        const homeTeamId = getTeamIdFromLogo(matchData.homeLogo);
        const awayTeamId = getTeamIdFromLogo(matchData.awayLogo);
        
        let teamsForEval: TeamDataInDB | undefined = undefined;
        if(homeTeamId && awayTeamId) {
             teamsForEval = {
                home: { id: homeTeamId, name: matchData.homeTeam, winner: null },
                away: { id: awayTeamId, name: matchData.awayTeam, winner: null },
            };
        }

        const mongoSession = client.startSession();
        let settledCount = 0;

        await mongoSession.withTransaction(async () => {
            const betsCollection = db.collection<WithId<PlacedBet>>('bets');
            const walletsCollection = db.collection('wallets');
            const notificationsCollection = db.collection('notifications');
            const usersCollection = db.collection('users');

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
                        if (!teamsForEval) {
                           return { ...selection, status: 'Anulada' as const };
                        }
                        return { ...selection, status: evaluateSelection(selection, goals, finalStats, teamsForEval) };
                    }
                    return selection;
                });
                
                const allSelectionsSettled = updatedSelections.every(s => s.status && s.status !== 'Em Aberto');
                
                if (allSelectionsSettled) {
                    const isBetLost = updatedSelections.some(s => s.status === 'Perdida');
                    const finalBetStatus = isBetLost ? 'Perdida' : 'Ganha';
                    
                    if (finalBetStatus === 'Perdida') {
                        await grantAchievement(bet.userId, 'first_loss');
                    }
                    
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

                        const user = await usersCollection.findOne({ discordId: bet.userId }, { session: mongoSession });
                        const xpMultiplier = user?.isVip ? 2 : 1;
                        const xpGain = bet.stake * xpMultiplier;
                        
                        // Add user XP for won bet
                        await usersCollection.updateOne(
                            { discordId: bet.userId },
                            { $inc: { xp: xpGain } },
                            { session: mongoSession }
                        );
                        
                        if (user) {
                           await sendWinNotification(bet, user as any, winnings);
                        }

                        // Grant first win achievement
                        await grantAchievement(bet.userId, 'first_win');
                        
                        // Grant multiple win achievement if applicable
                        if (bet.bets.length > 1) {
                            await grantAchievement(bet.userId, 'multiple_win');
                        }
                    }
                    
                    await betsCollection.updateOne(
                        { _id: bet._id },
                        { $set: { bets: updatedSelections, status: finalBetStatus, potentialWinnings: winnings, settledAt: new Date() } },
                        { session: mongoSession }
                    );

                    const notificationTitle = finalBetStatus === 'Ganha' ? 'Aposta Ganha!' : 'Aposta Perdida';
                    const betDescription = bet.bets.length > 1 
                        ? `Múltipla (${bet.bets.length} seleções)` 
                        : `${bet.bets[0].teamA} vs ${bet.bets[0].teamB}`;
                    const notificationDesc = `Sua aposta em "${betDescription}" foi resolvida. Clique para ver.`;

                    await notificationsCollection.insertOne({
                        userId: bet.userId,
                        title: notificationTitle,
                        description: notificationDesc,
                        date: new Date(),
                        read: false,
                        link: `/my-bets`
                    }, { session: mongoSession });
                    
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

        if (options.revalidate) {
            revalidatePath('/admin/matches');
            revalidatePath('/admin/bets');
            revalidatePath('/my-bets');
            revalidatePath('/wallet');
            revalidatePath('/notifications');
            revalidatePath('/profile');
            revalidatePath('/bolao');
        }

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
            const result = await resolveMatch(fixtureId, { revalidate: false });
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
    
    if (successCount > 0) {
        console.log('Revalidating paths...');
        revalidatePath('/admin/matches');
        revalidatePath('/admin/bets');
        revalidatePath('/my-bets');
        revalidatePath('/wallet');
        revalidatePath('/notifications');
        revalidatePath('/profile');
    }

    return {
        success: failureCount === 0,
        message: summaryMessage,
        details: results
    };
}

// Function to fetch dashboard stats
export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const betsCollection = db.collection('bets');
        const usersCollection = db.collection('users');

        const totalUsers = await usersCollection.countDocuments();

        const betsStats = await betsCollection.aggregate([
            {
                $group: {
                    _id: null,
                    totalWagered: { $sum: '$stake' },
                    totalBets: { $sum: 1 },
                    totalWinnings: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Ganha'] }, '$potentialWinnings', 0]
                        }
                    }
                }
            }
        ]).toArray();

        const stats = betsStats[0] || { totalWagered: 0, totalBets: 0, totalWinnings: 0 };
        const grossProfit = stats.totalWagered - stats.totalWinnings;

        return {
            totalWagered: stats.totalWagered,
            activeUsers: totalUsers,
            totalBets: stats.totalBets,
            grossProfit: grossProfit,
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return { totalWagered: 0, activeUsers: 0, totalBets: 0, grossProfit: 0 };
    }
}

// Function to fetch weekly bet volume
export async function getWeeklyBetVolume(): Promise<WeeklyBetVolume> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const betsCollection = db.collection('bets');
        
        const weekDayMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const volumeMap = new Map<string, number>();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Initialize map for the last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            volumeMap.set(key, 0);
        }

        const aggregationResult = await betsCollection.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "America/Sao_Paulo" } },
                    total: { $sum: "$stake" }
                }
            },
        ]).toArray();

        aggregationResult.forEach(item => {
            if (volumeMap.has(item._id)) {
                volumeMap.set(item._id, item.total);
            }
        });
        
        return Array.from(volumeMap.entries()).map(([dateStr, total]) => {
            const dateParts = dateStr.split('-').map(Number);
            // new Date('YYYY-MM-DD') can have timezone issues. Use UTC to be safe.
            const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
            return { date: weekDayMap[date.getUTCDay()], total };
        });

    } catch (error) {
        console.error("Error fetching weekly bet volume:", error);
        return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => ({ date: d, total: 0}));
    }
}

// Function to fetch top bettors by amount wagered
export async function getTopBettors(): Promise<TopBettor[]> {
     try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const betsCollection = db.collection('bets');

        const topBettorsData = await betsCollection.aggregate([
            {
                $group: {
                    _id: '$userId',
                    totalWagered: { $sum: '$stake' }
                }
            },
            { $sort: { totalWagered: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 0,
                    name: '$userDetails.name',
                    email: '$userDetails.email',
                    avatar: '$userDetails.image',
                    totalWagered: 1,
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();

        return topBettorsData.map(user => ({
            name: user.name as string,
            email: user.email as string,
            avatar: user.avatar as string,
            totalWagered: user.totalWagered as number,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching top bettors:', error);
        return [];
    }
}

// Function to fetch recent bets for dashboard
export async function getRecentBets(): Promise<RecentBet[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        
        const bets = await db.collection('bets').aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
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
            }
        ]).toArray();

        return bets.map((bet: any) => ({
            userName: bet.userDetails.name,
            userEmail: bet.userDetails.email,
            matchDescription: bet.bets.length > 1 
                ? `Múltipla (${bet.bets.length} seleções)` 
                : `${bet.bets[0].teamA} vs ${bet.bets[0].teamB}`,
            stake: bet.stake,
            status: bet.status
        }));

    } catch (error) {
        console.error("Error fetching recent bets for dashboard:", error);
        return [];
    }
}

// Function to get general site settings
export async function getSiteSettings() {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const settingsCollection = db.collection('site_settings');
        const settings = await settingsCollection.findOne({});
        
        return {
            maintenanceMode: settings?.maintenanceMode ?? false,
            welcomeBonus: settings?.welcomeBonus ?? 1000,
        };
    } catch (error) {
        console.error("Error fetching site settings:", error);
        return {
            maintenanceMode: false,
            welcomeBonus: 1000,
        };
    }
}

// ---- MVP VOTING ACTIONS ----
const getTeamIdFromLogo = (url: string | undefined): number | null => {
    if (!url) return null;
    const match = url.match(/\/teams\/(\d+)\.png$/);
    return match ? parseInt(match[1], 10) : null;
};


async function getMatchLineups(fixtureId: number): Promise<{ success: boolean; data?: MvpTeamLineup[]; message?: string }> {
    let apiKey;
    try {
      apiKey = await getAvailableApiKey();
    } catch (error: any) {
      console.error('API Key Error:', error.message);
      return { success: false, message: error.message };
    }

    const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures/players?fixture=${fixtureId}`;
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        },
        cache: 'no-store' as RequestCache
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            console.error(`API Error fetching players for fixture ${fixtureId}:`, errorData);
            return { success: false, message: `Erro na API: ${errorData.message || 'Falha ao buscar jogadores da partida.'}` };
        }

        const data = await response.json();
        if (!data.response || data.response.length === 0) {
            return { success: false, message: 'Jogadores não disponíveis para esta partida na API.' };
        }

        const lineups: MvpTeamLineup[] = data.response.map((teamData: any) => {
            const players = teamData.players
                .filter((p: any) => p.statistics[0]?.games?.minutes > 0)
                .map((p: any) => ({
                    id: p.player.id,
                    name: p.player.name,
                    photo: p.player.photo || 'https://placehold.co/40x40.png',
                }));

            return {
                teamId: teamData.team.id,
                teamName: teamData.team.name,
                teamLogo: teamData.team.logo,
                players: players,
            };
        });
        
        if (lineups.length === 0 || lineups.every(l => l.players.length === 0)) {
            return { success: false, message: 'Nenhum jogador que participou da partida foi encontrado na API. A votação MVP não pode ser criada.' };
        }

        return { success: true, data: lineups };

    } catch (error) {
        console.error(`Failed to fetch players for fixture ${fixtureId}:`, error);
        return { success: false, message: 'Falha crítica ao se comunicar com a API de jogadores.' };
    }
}

async function sendNewMvpNotification(voting: Omit<MvpVoting, '_id'>) {
    const config = await getBotConfig();
    const { siteUrl } = await getApiSettings();
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = config.mvpChannelId;

    if (!channelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        console.log('Discord MVP channel or bot token not configured. Skipping MVP notification.');
        return;
    }

    const embed = {
        color: 0xf97316, // orange-500
        title: '⭐ VOTAÇÃO MVP ABERTA! ⭐',
        description: `**${voting.homeTeam} vs ${voting.awayTeam}**\n\nQuem foi o melhor em campo? Vote agora e ganhe uma recompensa!`,
        fields: [
            { name: 'Recompensa por Voto', value: `**R$ 100,00**`, inline: true },
        ],
        footer: {
            text: `Campeonato: ${voting.league}`,
        },
        timestamp: new Date().toISOString(),
    };

    const payload: { embeds: any[], components?: any[] } = {
        embeds: [embed],
    };

    if (siteUrl) {
        payload.components = [
            {
                type: 1, // Action Row
                components: [
                    {
                        type: 2, // Button
                        style: 5, // Link
                        label: 'Votar no MVP',
                        url: `${siteUrl}/mvp`
                    }
                ]
            }
        ];
    } else {
        embed.fields.push({ name: 'Como participar?', value: `Acesse a aba **MVP** no nosso site para registrar seu voto!`, inline: false });
    }


     try {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${botToken}`,
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send new MVP notification to Discord:', JSON.stringify(errorData, null, 2));
        } else {
            console.log(`Successfully sent new MVP notification for match ${voting.matchId}`);
        }
    } catch (error) {
        console.error('Error sending new MVP notification to Discord:', error);
    }
}


export async function createMvpVoting(matchId: number): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const matchesCollection = db.collection('matches');
        const mvpVotingsCollection = db.collection('mvp_votings');

        const existingVoting = await mvpVotingsCollection.findOne({ matchId });
        if (existingVoting) {
            return { success: false, message: 'Já existe uma votação de MVP para esta partida.' };
        }

        const matchData = await matchesCollection.findOne({ _id: matchId });
        if (!matchData) {
            return { success: false, message: 'Partida não encontrada.' };
        }

        const lineupResult = await getMatchLineups(matchId);
        if (!lineupResult.success || !lineupResult.data) {
            return { success: false, message: lineupResult.message || 'Não foi possível obter as escalações.' };
        }
        
        const lineups = lineupResult.data;
        if(lineups.length < 2) {
             return { success: false, message: 'Dados de escalação incompletos da API.' };
        }


        const newVoting: Omit<MvpVoting, '_id'> = {
            matchId: matchData._id,
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            homeLogo: matchData.homeLogo || '',
            awayLogo: matchData.awayLogo || '',
            league: matchData.league,
            status: 'Aberto',
            lineups: lineups,
            votes: [],
            createdAt: new Date(),
        };

        await mvpVotingsCollection.insertOne(newVoting as any);
        await sendNewMvpNotification(newVoting);

        revalidatePath('/admin/matches');
        revalidatePath('/admin/mvp');
        revalidatePath('/mvp');

        return { success: true, message: 'Votação de MVP criada com sucesso!' };

    } catch (error) {
        console.error('Error creating MVP voting:', error);
        return { success: false, message: 'Ocorreu um erro ao criar a votação de MVP.' };
    }
}

export async function getAdminVotings(): Promise<MvpVoting[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const votings = await db.collection<MvpVoting>('mvp_votings')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
        return JSON.parse(JSON.stringify(votings));
    } catch (error) {
        console.error('Error fetching admin votings:', error);
        return [];
    }
}

export async function finalizeMvpVoting(votingId: string, mvpPlayerId: number): Promise<{ success: boolean; message: string }> {
     try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const mvpVotingsCollection = db.collection('mvp_votings');

        const result = await mvpVotingsCollection.updateOne(
            { _id: new ObjectId(votingId), status: 'Aberto' },
            {
                $set: {
                    status: 'Finalizado',
                    mvpPlayerId: mvpPlayerId,
                    finalizedAt: new Date(),
                }
            }
        );

        if (result.modifiedCount === 0) {
            return { success: false, message: 'Votação não encontrada ou já finalizada.' };
        }

        revalidatePath('/admin/mvp');
        revalidatePath('/mvp');

        return { success: true, message: 'Votação de MVP finalizada com sucesso!' };
    } catch (error) {
        console.error('Error finalizing MVP voting:', error);
        return { success: false, message: 'Ocorreu um erro ao finalizar a votação.' };
    }
}

export async function cancelMvpVoting(votingId: string): Promise<{ success: boolean; message: string }> {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();
    const VOTE_REWARD = 100;

    let result: { success: boolean; message: string } | undefined;

    try {
        await mongoSession.withTransaction(async () => {
            const mvpVotingsCollection = db.collection<MvpVoting>('mvp_votings');
            const walletsCollection = db.collection('wallets');
            const notificationsCollection = db.collection('notifications');

            const voting = await mvpVotingsCollection.findOne({ _id: new ObjectId(votingId), status: 'Aberto' }, { session: mongoSession });
            if (!voting) {
                throw new Error('Votação não encontrada ou já não está mais aberta.');
            }

            for (const vote of voting.votes) {
                const debitAmount = -VOTE_REWARD;
                const newTransaction: Transaction = {
                    id: new ObjectId().toString(),
                    type: 'Ajuste',
                    description: `Reversão de bônus: Votação MVP cancelada - ${voting.homeTeam} vs ${voting.awayTeam}`,
                    amount: debitAmount,
                    date: new Date().toISOString(),
                    status: 'Concluído',
                };
                await walletsCollection.updateOne(
                    { userId: vote.userId },
                    {
                        $inc: { balance: debitAmount },
                        $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
                    },
                    { session: mongoSession }
                );

                const newNotification: Omit<Notification, '_id'> = {
                    userId: vote.userId,
                    title: 'Votação MVP Cancelada',
                    description: `A votação MVP para ${voting.homeTeam} vs ${voting.awayTeam} foi cancelada. O bônus de R$ ${VOTE_REWARD.toFixed(2)} foi revertido.`,
                    date: new Date(),
                    read: false,
                    link: '/wallet'
                };
                await notificationsCollection.insertOne(newNotification as any, { session: mongoSession });
            }

            await mvpVotingsCollection.updateOne(
                { _id: new ObjectId(votingId) },
                { $set: { status: 'Cancelado' } },
                { session: mongoSession }
            );

            result = { success: true, message: `Votação cancelada e o bônus de ${voting.votes.length} participante(s) foi revertido.` };
        });

        await mongoSession.endSession();

        if (result?.success) {
            revalidatePath('/admin/mvp');
            revalidatePath('/mvp');
            revalidatePath('/wallet');
            revalidatePath('/notifications');
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao cancelar a votação.' };
    }
}

// ---- ADMIN STORE ACTIONS ----

type StoreItemAdminData = Omit<StoreItem, '_id' | 'createdAt'> & { id: string };

export async function getAdminStoreItems(): Promise<StoreItemAdminData[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const items = await db.collection<StoreItem>('store_items')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        return items.map(item => ({
            id: item._id.toString(),
            name: item.name,
            description: item.description,
            price: item.price,
            type: item.type,
            duration: item.duration,
            roleId: item.roleId,
            xpAmount: item.xpAmount,
            isActive: item.isActive,
        }));
    } catch (error) {
        console.error("Error fetching admin store items:", error);
        return [];
    }
}

export async function upsertStoreItem(data: Omit<StoreItemAdminData, 'id'> & {id?: string}): Promise<{ success: boolean; message: string }> {
    const { id, ...itemData } = data;

    if (itemData.type === 'XP_BOOST') {
        itemData.duration = 'PERMANENT';
    }

    const itemToSave = {
        ...itemData,
        xpAmount: itemData.type === 'XP_BOOST' ? itemData.xpAmount : undefined,
        roleId: itemData.type === 'ROLE' ? itemData.roleId : undefined,
    };
    
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<StoreItem>('store_items');

        if (id) {
            // Update
            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: itemToSave }
            );
        } else {
            // Insert
            await collection.insertOne({
                ...itemToSave,
                createdAt: new Date(),
            } as StoreItem);
        }
        revalidatePath('/admin/store');
        revalidatePath('/store');
        return { success: true, message: `Item ${id ? 'atualizado' : 'criado'} com sucesso!` };
    } catch (error) {
        console.error("Error upserting store item:", error);
        return { success: false, message: "Ocorreu um erro ao salvar o item." };
    }
}

export async function deleteStoreItem(itemId: string): Promise<{ success: boolean; message: string }> {
     try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<StoreItem>('store_items');

        await collection.deleteOne({ _id: new ObjectId(itemId) });

        revalidatePath('/admin/store');
        revalidatePath('/store');
        return { success: true, message: "Item excluído com sucesso." };
    } catch (error) {
        console.error("Error deleting store item:", error);
        return { success: false, message: "Ocorreu um erro ao excluir o item." };
    }
}
