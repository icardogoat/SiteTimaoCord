'use server';

import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import type { PromoCode, Notification, Transaction } from '@/types';
import { ObjectId } from 'mongodb';

export async function redeemCode(code: string): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return { success: false, message: 'Você precisa estar logado para resgatar um código.' };
    }
    const userId = session.user.discordId;

    if (!code || code.trim() === '') {
        return { success: false, message: 'Por favor, insira um código.' };
    }

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let resultMessage = '';

        await mongoSession.withTransaction(async () => {
            const promoCodesCollection = db.collection<PromoCode>('promo_codes');
            const codeDoc = await promoCodesCollection.findOne({ code: code.toUpperCase() }, { session: mongoSession });

            if (!codeDoc) {
                throw new Error('Código inválido ou não encontrado.');
            }
            if (codeDoc.status !== 'ACTIVE') {
                throw new Error(`Este código já foi ${codeDoc.status === 'REDEEMED' ? 'resgatado' : 'expirado/revogado'}.`);
            }
            if (codeDoc.expiresAt && new Date(codeDoc.expiresAt) < new Date()) {
                 await promoCodesCollection.updateOne(
                    { _id: codeDoc._id },
                    { $set: { status: 'EXPIRED' } },
                    { session: mongoSession }
                );
                throw new Error('Este código expirou.');
            }

            // Mark code as redeemed
            const updateResult = await promoCodesCollection.updateOne(
                { _id: codeDoc._id, status: 'ACTIVE' },
                {
                    $set: {
                        status: 'REDEEMED',
                        redeemedBy: userId,
                        redeemedAt: new Date(),
                    }
                },
                { session: mongoSession }
            );

            if (updateResult.modifiedCount === 0) {
                 throw new Error('Este código acabou de ser resgatado por outra pessoa. Tente novamente.');
            }

            let notificationDescription = '';
            
            // Apply reward
            if (codeDoc.type === 'MONEY' || codeDoc.type === 'DAILY') {
                const amount = Number(codeDoc.value);
                const walletsCollection = db.collection('wallets');
                const newTransaction: Transaction = {
                    id: new ObjectId().toString(),
                    type: 'Bônus',
                    description: codeDoc.description,
                    amount: amount,
                    date: new Date().toISOString(),
                    status: 'Concluído',
                };
                await walletsCollection.updateOne(
                    { userId },
                    {
                        $inc: { balance: amount },
                        $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
                    },
                    { upsert: true, session: mongoSession }
                );
                notificationDescription = `Você ganhou R$ ${amount.toFixed(2)}!`;

            } else if (codeDoc.type === 'XP') {
                const amount = Number(codeDoc.value);
                const usersCollection = db.collection('users');
                await usersCollection.updateOne(
                    { discordId: userId },
                    { $inc: { xp: amount } },
                    { session: mongoSession }
                );
                notificationDescription = `Você ganhou ${amount} de XP!`;

            } else if (codeDoc.type === 'ROLE') {
                const roleId = String(codeDoc.value);
                const pendingRewardsCollection = db.collection('pending_rewards');
                await pendingRewardsCollection.insertOne({
                    userId,
                    type: 'role',
                    roleId,
                    reason: `Resgate do código: ${codeDoc.description}`,
                    createdAt: new Date(),
                }, { session: mongoSession });
                notificationDescription = `Você ganhou um novo cargo! Verifique o Discord.`;
            }

            // Send notification
            const notificationsCollection = db.collection('notifications');
            const newNotification: Omit<Notification, '_id'> = {
                userId: userId,
                title: '🎁 Recompensa Resgatada!',
                description: `Você resgatou o código "${codeDoc.code}". ${notificationDescription}`,
                date: new Date(),
                read: false,
                link: '/wallet',
                isPriority: true,
            };
            await notificationsCollection.insertOne(newNotification as any, { session: mongoSession });
            
            resultMessage = `Recompensa resgatada com sucesso! ${notificationDescription}`;
        });

        await mongoSession.endSession();
        
        revalidatePath('/wallet');
        revalidatePath('/profile');
        revalidatePath('/notifications');

        return { success: true, message: resultMessage };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro desconhecido.' };
    }
}
