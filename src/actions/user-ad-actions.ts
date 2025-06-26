'use server';

import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Advertisement, Transaction } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

const AD_PRICE = 500; // Price for one week of advertising

interface CreateAdResult {
  success: boolean;
  message: string;
}

export async function getUserAdPrice(): Promise<number> {
    return AD_PRICE;
}

export async function submitUserAdvertisement(data: Omit<Advertisement, '_id' | 'createdAt' | 'owner' | 'status' | 'userId'>): Promise<CreateAdResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return { success: false, message: 'Você precisa estar logado para anunciar.' };
  }

  const userId = session.user.discordId;

  const client = await clientPromise;
  const db = client.db('timaocord');
  const mongoSession = client.startSession();

  try {
    let result: CreateAdResult | undefined;

    await mongoSession.withTransaction(async () => {
        const walletsCollection = db.collection('wallets');
        const adsCollection = db.collection('advertisements');

        const userWallet = await walletsCollection.findOne({ userId }, { session: mongoSession });

        if (!userWallet || userWallet.balance < AD_PRICE) {
            throw new Error(`Saldo insuficiente. Você precisa de R$ ${AD_PRICE.toFixed(2)} para criar um anúncio.`);
        }
        
        // 1. Deduct price from wallet
        const newBalance = userWallet.balance - AD_PRICE;
        const newTransaction: Transaction = {
            id: new ObjectId().toString(),
            type: 'Loja',
            description: `Compra de Espaço Publicitário: ${data.title}`,
            amount: -AD_PRICE,
            date: new Date().toISOString(),
            status: 'Concluído',
        };
        await walletsCollection.updateOne(
            { userId },
            {
                $set: { balance: newBalance },
                $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
            },
            { session: mongoSession }
        );

        // 2. Create the advertisement record
        const newAd: Omit<Advertisement, '_id'> = {
            ...data,
            owner: 'user',
            userId: userId,
            status: 'inactive', // Admin must approve
            createdAt: new Date(),
        };

        await adsCollection.insertOne(newAd as any, { session: mongoSession });
        
        result = { success: true, message: 'Anúncio enviado para revisão! Ele aparecerá no site assim que for aprovado por um administrador.' };
    });
    
    await mongoSession.endSession();

    if (result?.success) {
        revalidatePath('/wallet');
        revalidatePath('/admin/ads'); // Notify admin panel of new ad
        return result;
    }

    return { success: false, message: 'A transação falhou.' };

  } catch (error: any) {
    await mongoSession.endSession();
    return { success: false, message: error.message || 'Ocorreu um erro ao enviar seu anúncio.' };
  }
}
