
'use server';

import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { CassinoBet, Transaction } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

// This function determines the crash point of the game.
// A house edge of ~3% is typical. 
// This formula creates a distribution where most crashes are low, but high ones are possible.
function calculateCrashPoint(): number {
    const houseEdge = 0.03; // 3% house edge
    const r = Math.random();
    // Formula to create a fair distribution of crash points.
    // The result is a multiplier, e.g., 1.52x, 2.00x, 10.43x
    const crashPoint = Math.floor(100 / (1 - r)) / 100 * (1 - houseEdge);
    
    // Ensure crash point is at least 1.00
    return Math.max(1.00, crashPoint);
}

interface PlaceCassinoBetResult {
  success: boolean;
  message: string;
  betId?: string;
  crashPoint?: number;
  newBalance?: number;
}

export async function placeCassinoBet(stake: number): Promise<PlaceCassinoBetResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return { success: false, message: 'Você precisa estar logado para jogar.' };
    }
    const userId = session.user.discordId;

    if (stake <= 0) {
        return { success: false, message: 'Valor da aposta inválido.' };
    }

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: PlaceCassinoBetResult | undefined;

        await mongoSession.withTransaction(async () => {
            const walletsCollection = db.collection('wallets');
            const cassinoBetsCollection = db.collection<CassinoBet>('cassino_bets');

            const userWallet = await walletsCollection.findOne({ userId }, { session: mongoSession });

            if (!userWallet || userWallet.balance < stake) {
                throw new Error('Saldo insuficiente.');
            }
            
            // Check for and resolve any existing, unfinished game as a loss.
            // This prevents a user from being locked out if they refresh the page.
            const existingBet = await cassinoBetsCollection.findOne({ userId, status: 'playing' }, { session: mongoSession });
            if (existingBet) {
                console.warn(`User ${userId} had a stuck game (${existingBet._id}). Marking it as crashed before starting a new one.`);
                await cassinoBetsCollection.updateOne(
                    { _id: existingBet._id },
                    { $set: { status: 'crashed', settledAt: new Date() } },
                    { session: mongoSession }
                );
            }

            // Now, create the new bet.
            const newTransaction: Transaction = {
                id: new ObjectId().toString(),
                type: 'Aposta',
                description: 'Jogo do Foguetinho',
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
            
            const crashPoint = calculateCrashPoint();
            const newBet: Omit<CassinoBet, '_id'> = {
                userId,
                stake,
                crashPoint,
                status: 'playing',
                createdAt: new Date(),
            };

            const insertResult = await cassinoBetsCollection.insertOne(newBet as any, { session: mongoSession });
            
            result = { 
                success: true, 
                message: 'Jogo iniciado!', 
                betId: insertResult.insertedId.toString(),
                crashPoint,
                newBalance
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
        return { success: false, message: error.message || 'Ocorreu um erro ao iniciar o jogo.' };
    }
}

interface CashOutResult {
    success: boolean;
    message: string;
    winnings?: number;
    newBalance?: number;
    crashPoint?: number;
}

export async function cashOutCassino(betId: string, cashOutMultiplier: number): Promise<CashOutResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return { success: false, message: 'Sessão inválida.' };
    }
    const userId = session.user.discordId;

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: CashOutResult | undefined;

        await mongoSession.withTransaction(async () => {
            const walletsCollection = db.collection('wallets');
            const cassinoBetsCollection = db.collection<CassinoBet>('cassino_bets');

            const bet = await cassinoBetsCollection.findOne({ _id: new ObjectId(betId), userId }, { session: mongoSession });
            
            if (!bet) {
                throw new Error('Aposta não encontrada.');
            }
            if (bet.status !== 'playing') {
                throw new Error('Este jogo já foi finalizado.');
            }
            
            // Check if the user tried to cash out after or at the crash point
            if (cashOutMultiplier >= bet.crashPoint) {
                 await cassinoBetsCollection.updateOne(
                    { _id: new ObjectId(betId) },
                    { $set: { status: 'crashed', settledAt: new Date() } },
                    { session: mongoSession }
                );
                result = { success: false, message: `O jogo parou em ${bet.crashPoint.toFixed(2)}x. Você não sacou a tempo!`, crashPoint: bet.crashPoint };
                return;
            }

            // If cash out is valid
            const winnings = bet.stake * cashOutMultiplier;
            const prizeTransaction: Transaction = {
                id: new ObjectId().toString(),
                type: 'Prêmio',
                description: `Jogo do Foguetinho @ ${cashOutMultiplier.toFixed(2)}x`,
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

            await cassinoBetsCollection.updateOne(
                { _id: new ObjectId(betId) },
                { 
                    $set: { 
                        status: 'cashed_out',
                        settledAt: new Date(),
                        winnings: winnings,
                        cashOutMultiplier: cashOutMultiplier,
                    } 
                },
                { session: mongoSession }
            );
            
            const userWallet = await walletsCollection.findOne({ userId }, { session: mongoSession });

            result = {
                success: true,
                message: `Você sacou R$ ${winnings.toFixed(2)}!`,
                winnings: winnings,
                newBalance: userWallet?.balance ?? session.user.balance,
            }
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
