
'use server';

import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import type { Bolao, Notification, Transaction } from '@/types';
import { ObjectId } from 'mongodb';

const ENTRY_FEE = 5;

export async function createBolao(matchId: number): Promise<{ success: boolean, message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
        return { success: false, message: 'Acesso negado.' };
    }

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const matchesCollection = db.collection('matches');
        const boloesCollection = db.collection('boloes');

        const existingBolao = await boloesCollection.findOne({ matchId });
        if (existingBolao) {
            return { success: false, message: 'Já existe um bolão para esta partida.' };
        }
        
        const matchData = await matchesCollection.findOne({ _id: matchId });
        if (!matchData) {
            return { success: false, message: 'Partida não encontrada.' };
        }

        const newBolao: Omit<Bolao, '_id'> = {
            matchId: matchData._id,
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            homeLogo: matchData.homeLogo,
            awayLogo: matchData.awayLogo,
            league: matchData.league,
            matchTime: new Date(matchData.timestamp * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            entryFee: ENTRY_FEE,
            prizePool: 0,
            status: 'Aberto',
            participants: [],
            createdAt: new Date(),
        };

        await boloesCollection.insertOne(newBolao as any);
        revalidatePath('/admin/matches');
        revalidatePath('/bolao');

        return { success: true, message: 'Bolão criado com sucesso!' };

    } catch (error) {
        console.error('Error creating bolao:', error);
        return { success: false, message: 'Ocorreu um erro ao criar o bolão.' };
    }
}

export async function getActiveBoloes(): Promise<Bolao[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const boloesCollection = db.collection<Bolao>('boloes');

        const activeBoloes = await boloesCollection.find({ status: 'Aberto' }).sort({ createdAt: -1 }).toArray();
        if (!activeBoloes) return [];

        return JSON.parse(JSON.stringify(activeBoloes));
    } catch (error) {
        console.error('Error fetching active boloes:', error);
        return [];
    }
}

export async function joinBolao(bolaoId: string, guess: { home: number, away: number }): Promise<{ success: boolean, message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { success: false, message: 'Você precisa estar logado para participar.' };
    }
    const { discordId, name, image } = session.user;

    if (guess.home < 0 || guess.away < 0 || !Number.isInteger(guess.home) || !Number.isInteger(guess.away)) {
        return { success: false, message: 'Placar inválido.' };
    }

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: { success: boolean, message: string } | undefined;

        await mongoSession.withTransaction(async () => {
            const boloesCollection = db.collection<Bolao>('boloes');
            const walletsCollection = db.collection('wallets');

            const bolao = await boloesCollection.findOne({ _id: new ObjectId(bolaoId) }, { session: mongoSession });
            if (!bolao || bolao.status !== 'Aberto') {
                throw new Error('Este bolão não está mais aberto para palpites.');
            }

            if (bolao.participants.some(p => p.userId === discordId)) {
                throw new Error('Você já participou deste bolão.');
            }

            const userWallet = await walletsCollection.findOne({ userId: discordId }, { session: mongoSession });
            if (!userWallet || userWallet.balance < bolao.entryFee) {
                throw new Error('Saldo insuficiente para entrar no bolão.');
            }

            // Deduct fee and add to prize pool
            const newBalance = userWallet.balance - bolao.entryFee;
            
            const newTransaction: Transaction = {
                id: new ObjectId().toString(),
                type: 'Aposta',
                description: `Entrada no Bolão: ${bolao.homeTeam} vs ${bolao.awayTeam}`,
                amount: -bolao.entryFee,
                date: new Date().toISOString(),
                status: 'Concluído',
            };

            await walletsCollection.updateOne(
                { userId: discordId },
                {
                    $set: { balance: newBalance },
                    $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
                },
                { session: mongoSession }
            );

            // Add participant to bolao
            const newParticipant = {
                userId: discordId,
                name: name ?? 'Usuário',
                avatar: image ?? '',
                guess: { home: guess.home, away: guess.away },
                guessedAt: new Date(),
            };

            await boloesCollection.updateOne(
                { _id: new ObjectId(bolaoId) },
                {
                    $inc: { prizePool: bolao.entryFee },
                    $push: { participants: newParticipant },
                },
                { session: mongoSession }
            );
            
            result = { success: true, message: 'Você entrou no bolão! Boa sorte!' };
        });

        await mongoSession.endSession();

        if(result?.success) {
            revalidatePath('/bolao');
            revalidatePath('/wallet');
            return result;
        }
        
        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao entrar no bolão.' };
    }
}


export async function cancelBolao(bolaoId: string): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
        return { success: false, message: 'Acesso negado.' };
    }

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: { success: boolean, message: string } | undefined;

        await mongoSession.withTransaction(async () => {
            const boloesCollection = db.collection<Bolao>('boloes');
            const walletsCollection = db.collection('wallets');
            const notificationsCollection = db.collection('notifications');

            const bolao = await boloesCollection.findOne({ _id: new ObjectId(bolaoId), status: 'Aberto' }, { session: mongoSession });
            if (!bolao) {
                throw new Error('Bolão não encontrado ou já não está mais aberto.');
            }

            // Refund all participants
            for (const participant of bolao.participants) {
                const refundAmount = bolao.entryFee;
                const newTransaction: Transaction = {
                    id: new ObjectId().toString(),
                    type: 'Bônus',
                    description: `Reembolso: Bolão cancelado - ${bolao.homeTeam} vs ${bolao.awayTeam}`,
                    amount: refundAmount,
                    date: new Date().toISOString(),
                    status: 'Concluído',
                };
                await walletsCollection.updateOne(
                    { userId: participant.userId },
                    {
                        $inc: { balance: refundAmount },
                        $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
                    },
                    { session: mongoSession }
                );

                const newNotification: Omit<Notification, '_id'> = {
                    userId: participant.userId,
                    title: 'Bolão Cancelado',
                    description: `O bolão para a partida ${bolao.homeTeam} vs ${bolao.awayTeam} foi cancelado. R$ ${refundAmount.toFixed(2)} foram devolvidos à sua carteira.`,
                    date: new Date(),
                    read: false,
                    link: '/wallet'
                };
                await notificationsCollection.insertOne(newNotification as any, { session: mongoSession });
            }

            // Update bolao status
            await boloesCollection.updateOne(
                { _id: new ObjectId(bolaoId) },
                { $set: { status: 'Cancelado' } },
                { session: mongoSession }
            );

            result = { success: true, message: `Bolão cancelado e ${bolao.participants.length} participante(s) reembolsado(s).` };
        });

        await mongoSession.endSession();
        
        if (result?.success) {
            revalidatePath('/bolao');
            revalidatePath('/admin/matches');
            revalidatePath('/wallet');
            revalidatePath('/notifications');
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao cancelar o bolão.' };
    }
}
