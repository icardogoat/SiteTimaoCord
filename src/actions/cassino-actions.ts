
'use server';

import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { CassinoBet, CassinoGameRound, Transaction } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId, WithId } from 'mongodb';

// --- Game Constants ---
const BETTING_DURATION_MS = 7000; // 7 seconds to place bets
const POST_CRASH_DELAY_MS = 4000; // 4 seconds to show crash result

function calculateCrashPoint(): number {
    // This formula creates a distribution where most crashes are low, but high ones are possible.
    const houseEdge = 0.03; // 3% house edge
    const r = Math.random();
    const crashPoint = Math.floor(100 / (1 - r)) / 100 * (1 - houseEdge);
    
    // Ensure crash point is at least 1.00
    return Math.max(1.00, crashPoint);
}

// Singleton function to get or create the current game round
async function getCurrentGameRound(): Promise<WithId<CassinoGameRound>> {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const roundsCollection = db.collection<CassinoGameRound>('cassino_game_round');

    const lastRound = await roundsCollection.findOne({}, { sort: { roundNumber: -1 } });
    const now = new Date();

    // If a round is currently in betting or playing state, return it
    if (lastRound && (lastRound.status === 'betting' || lastRound.status === 'playing')) {
        // If a "playing" round has passed its crash time, mark it as crashed
        if (lastRound.status === 'playing' && lastRound.startedAt) {
            // This calculation is an approximation of the time it takes to reach the crash point
            const timeToCrash = (Math.log(lastRound.crashPoint) / Math.log(1.06)) * 100;
            const timeSinceStart = now.getTime() - new Date(lastRound.startedAt).getTime();
            
            if (timeSinceStart > timeToCrash + 500) { // Add a small buffer
                 await roundsCollection.updateOne(
                    { _id: lastRound._id },
                    { $set: { status: 'crashed', settledAt: now } }
                );
                lastRound.status = 'crashed';
                lastRound.settledAt = now;
            } else {
                 return lastRound;
            }
        } else {
            return lastRound;
        }
    }
    
    // If last round is crashed and post-crash delay has passed, or if no round exists, create a new one.
    if (!lastRound || (lastRound.status === 'crashed' && lastRound.settledAt && now.getTime() > new Date(lastRound.settledAt).getTime() + POST_CRASH_DELAY_MS)) {
        const newRoundData: Omit<CassinoGameRound, '_id'> = {
            roundNumber: (lastRound?.roundNumber || 0) + 1,
            status: 'betting',
            crashPoint: calculateCrashPoint(),
            bettingEndsAt: new Date(now.getTime() + BETTING_DURATION_MS),
        };
        const result = await roundsCollection.insertOne(newRoundData as any);
        return { ...newRoundData, _id: result.insertedId };
    }

    // Otherwise, the last round is still in its post-crash display phase
    return lastRound;
}


// Server action for the client to poll for the game state
export async function getGameState(): Promise<CassinoGameRound> {
    const round = await getCurrentGameRound();
    // Return a serializable object
    return JSON.parse(JSON.stringify(round));
}

// Action to transition the round from 'betting' to 'playing'
export async function startGameRound(roundId: string): Promise<CassinoGameRound> {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const roundsCollection = db.collection<CassinoGameRound>('cassino_game_round');
    
    const now = new Date();
    const result = await roundsCollection.findOneAndUpdate(
        { _id: new ObjectId(roundId), status: 'betting' },
        { $set: { status: 'playing', startedAt: now } },
        { returnDocument: 'after' }
    );
    
    if (!result) {
        // Another process might have already started it, so just fetch the latest state
        const currentRound = await getCurrentGameRound();
        return JSON.parse(JSON.stringify(currentRound));
    }

    return JSON.parse(JSON.stringify(result));
}

export async function placeCassinoBet(payload: { stake: number; roundId: string }): Promise<{ success: boolean; message: string; bet?: any }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return { success: false, message: 'Você precisa estar logado para jogar.' };
    }
    const { discordId: userId, name: userName, image: userAvatar } = session.user;
    const { stake, roundId } = payload;

    if (stake <= 0) {
        return { success: false, message: 'Valor da aposta inválido.' };
    }

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: { success: boolean, message: string, bet?: any } | undefined;

        await mongoSession.withTransaction(async () => {
            const roundsCollection = db.collection('cassino_game_round');
            const walletsCollection = db.collection('wallets');
            const betsCollection = db.collection('cassino_bets');

            // 1. Verify the round is open for betting
            const round = await roundsCollection.findOne({ _id: new ObjectId(roundId) }, { session: mongoSession });
            if (!round || round.status !== 'betting') {
                throw new Error('A fase de apostas para esta rodada encerrou.');
            }
            
            // 2. Verify user has not already bet on this round
            const existingBet = await betsCollection.findOne({ userId, roundId: new ObjectId(roundId) }, { session: mongoSession });
            if (existingBet) {
                throw new Error('Você já apostou nesta rodada.');
            }

            // 3. Verify balance and deduct stake
            const userWallet = await walletsCollection.findOne({ userId }, { session: mongoSession });
            if (!userWallet || userWallet.balance < stake) {
                throw new Error('Saldo insuficiente.');
            }
            
            const newTransaction: Transaction = {
                id: new ObjectId().toString(),
                type: 'Aposta',
                description: `Jogo do Foguetinho (Rodada #${round.roundNumber})`,
                amount: -stake,
                date: new Date().toISOString(),
                status: 'Concluído',
            };
            const newBalance = userWallet.balance - stake;
            await walletsCollection.updateOne(
                { userId },
                {
                    $set: { balance: newBalance },
                    $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
                },
                { session: mongoSession }
            );
            
            // 4. Create the bet document
            const newBet: Omit<CassinoBet, '_id'> = {
                userId,
                userName: userName || 'Jogador',
                userAvatar: userAvatar || '',
                roundId: new ObjectId(roundId),
                stake,
                status: 'playing',
                createdAt: new Date(),
            };

            const insertResult = await betsCollection.insertOne(newBet as any, { session: mongoSession });
            
            const betForClient = { ...newBet, _id: insertResult.insertedId.toString() };

            result = { 
                success: true, 
                message: 'Aposta confirmada!',
                bet: JSON.parse(JSON.stringify(betForClient)),
            };
        });

        await mongoSession.endSession();

        if (result?.success) {
            revalidatePath('/wallet');
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao apostar.' };
    }
}

export async function cashOutCassino(betId: string, cashOutMultiplier: number): Promise<{ success: boolean; message: string; winnings?: number; }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return { success: false, message: 'Sessão inválida.' };
    }
    const userId = session.user.discordId;

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: { success: boolean; message: string; winnings?: number; } | undefined;

        await mongoSession.withTransaction(async () => {
            const betsCollection = db.collection<CassinoBet>('cassino_bets');
            const roundsCollection = db.collection('cassino_game_round');
            const walletsCollection = db.collection('wallets');

            const bet = await betsCollection.findOne({ _id: new ObjectId(betId), userId }, { session: mongoSession });
            
            if (!bet) throw new Error('Aposta não encontrada.');
            if (bet.status !== 'playing') throw new Error('Você já sacou ou o jogo acabou.');
            
            const round = await roundsCollection.findOne({ _id: bet.roundId }, { session: mongoSession });
            if (!round) throw new Error('Rodada do jogo não encontrada.');
            if (round.status !== 'playing') throw new Error('A rodada não está mais em jogo.');

            if (cashOutMultiplier >= round.crashPoint) {
                // This is a safety check, but the client should prevent this.
                result = { success: false, message: `O jogo parou em ${round.crashPoint.toFixed(2)}x. Você não sacou a tempo!` };
                return;
            }
            
            const winnings = bet.stake * cashOutMultiplier;
            const prizeTransaction: Transaction = {
                id: new ObjectId().toString(),
                type: 'Prêmio',
                description: `Jogo do Foguetinho @ ${cashOutMultiplier.toFixed(2)}x (Rodada #${round.roundNumber})`,
                amount: winnings,
                date: new Date().toISOString(),
                status: 'Concluído',
            };

            await walletsCollection.updateOne(
                { userId },
                {
                    $inc: { balance: winnings },
                    $push: { transactions: { $each: [prizeTransaction], $sort: { date: -1 } } },
                },
                { session: mongoSession }
            );

            await betsCollection.updateOne(
                { _id: bet._id },
                { $set: { status: 'cashed_out', winnings, cashOutMultiplier } },
                { session: mongoSession }
            );

            result = {
                success: true,
                message: `Você sacou R$ ${winnings.toFixed(2)}!`,
                winnings: winnings,
            };
        });

        await mongoSession.endSession();

        if (result) {
            revalidatePath('/wallet');
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao sacar.' };
    }
}


export async function getRecentCassinoGames(): Promise<{ crashPoint: number }[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const roundsCollection = db.collection<CassinoGameRound>('cassino_game_round');

        const recentGames = await roundsCollection
            .find({ status: 'crashed' })
            .sort({ roundNumber: -1 })
            .limit(15)
            .project<{ crashPoint: number }>({ crashPoint: 1, _id: 0 })
            .toArray();
            
        return recentGames.reverse();
    } catch (error) {
        console.error('Error fetching recent cassino games:', error);
        return [];
    }
}

// Function to get bets for a specific round
export async function getBetsForRound(roundId: string): Promise<CassinoBet[]> {
  try {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const betsCollection = db.collection<CassinoBet>('cassino_bets');
    const bets = await betsCollection.find({ roundId: new ObjectId(roundId) }).toArray();
    return JSON.parse(JSON.stringify(bets));
  } catch (error) {
    console.error(`Error fetching bets for round ${roundId}:`, error);
    return [];
  }
}
