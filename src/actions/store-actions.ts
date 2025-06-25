
'use server';

import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Transaction } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

// In a real application, these would be stored in the database.
const storeItems = [
    {
        id: 'chat-tag',
        name: 'Tag de Chat Exclusiva',
        description: 'Destaque-se no chat do Discord com uma tag exclusiva ao lado do seu nome.',
        price: 5000,
    },
    {
        id: 'xp-boost',
        name: '1000 de XP Bônus',
        description: 'Receba 1000 de XP para subir de nível mais rápido e desbloquear recompensas.',
        price: 2500,
    },
    {
        id: 'vip-status',
        name: 'Status VIP (1 Mês)',
        description: 'Acesso a canais exclusivos, sorteios especiais e outras vantagens no Discord.',
        price: 10000,
    }
];

// This function returns serializable store item data.
export async function getStoreItems() {
    return storeItems;
};

interface PurchaseResult {
    success: boolean;
    message: string;
}

const VIP_DISCOUNT_MULTIPLIER = 0.9; // 10% discount

export async function purchaseItem(itemId: string): Promise<PurchaseResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return { success: false, message: 'Você precisa estar logado para comprar.' };
    }

    const userId = session.user.discordId;
    const isVip = session.user.isVip;
    const item = storeItems.find(i => i.id === itemId);

    if (!item) {
        return { success: false, message: 'Item não encontrado.' };
    }

    const finalPrice = isVip ? item.price * VIP_DISCOUNT_MULTIPLIER : item.price;

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: PurchaseResult | undefined;

        await mongoSession.withTransaction(async () => {
            const walletsCollection = db.collection('wallets');
            const usersCollection = db.collection('users');

            const userWallet = await walletsCollection.findOne({ userId }, { session: mongoSession });

            if (!userWallet || userWallet.balance < finalPrice) {
                throw new Error('Saldo insuficiente.');
            }

            // Specific logic for XP boost
            if (item.id === 'xp-boost') {
                await usersCollection.updateOne(
                    { discordId: userId },
                    { $inc: { xp: 1000 } },
                    { session: mongoSession }
                );
            }
            // In a real app, logic for other items (like applying a Discord role) would go here.

            const newTransaction: Transaction = {
                id: new ObjectId().toString(),
                type: 'Loja',
                description: `Compra: ${item.name}`,
                amount: -finalPrice,
                date: new Date().toISOString(),
                status: 'Concluído',
            };

            const newBalance = userWallet.balance - finalPrice;
            await walletsCollection.updateOne(
                { userId },
                {
                    $set: { balance: newBalance },
                    $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } }
                },
                { session: mongoSession }
            );

            result = { success: true, message: `"${item.name}" comprado com sucesso!` };
        });
        
        await mongoSession.endSession();

        if (result?.success) {
            revalidatePath('/wallet');
            revalidatePath('/store');
            revalidatePath('/profile'); // Revalidate profile in case of XP purchase
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao processar sua compra.' };
    }
}
