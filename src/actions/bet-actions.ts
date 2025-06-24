'use server';

import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { BetInSlip, Transaction, PlacedBet } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';


interface PlaceBetResult {
  success: boolean;
  message: string;
  newBalance?: number;
}

export async function placeBet(betsInSlip: BetInSlip[], stake: number): Promise<PlaceBetResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return { success: false, message: 'Você precisa estar logado para apostar.' };
  }

  const userId = session.user.discordId;

  if (betsInSlip.length === 0 || stake <= 0) {
    return { success: false, message: 'Aposta inválida.' };
  }

  const client = await clientPromise;
  const db = client.db('timaocord');
  const mongoSession = client.startSession();

  try {
    const result = await mongoSession.withTransaction(async () => {
      const walletsCollection = db.collection('wallets');
      const betsCollection = db.collection('bets');

      const userWallet = await walletsCollection.findOne({ userId }, { session: mongoSession });

      if (!userWallet || userWallet.balance < stake) {
        // Abort transaction by throwing an error
        throw new Error('Saldo insuficiente.');
      }
      
      const totalOdds = betsInSlip.reduce((acc, bet) => acc * parseFloat(bet.odd.value), 1);
      const potentialWinnings = stake * totalOdds;
      const description = betsInSlip.length > 1 ? `Múltipla (${betsInSlip.length} seleções)` : `${betsInSlip[0].teamA} vs ${betsInSlip[0].teamB}`;

      const newPlacedBet: Omit<PlacedBet, '_id'> = {
        userId: userId,
        bets: betsInSlip.map(b => ({
          matchId: b.matchId,
          matchTime: b.matchTime,
          teamA: b.teamA,
          teamB: b.teamB,
          league: b.league,
          marketName: b.marketName,
          selection: b.odd.label,
          oddValue: b.odd.value,
        })),
        stake,
        potentialWinnings,
        totalOdds,
        status: 'Em Aberto',
        createdAt: new Date(),
      };
      
      await betsCollection.insertOne(newPlacedBet as any, { session: mongoSession });

      const newTransaction: Transaction = {
        id: new ObjectId().toString(),
        type: 'Aposta',
        description,
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
      
      return { success: true, message: 'Aposta realizada com sucesso!', newBalance };
    });

    if (result.success) {
        revalidatePath('/my-bets');
        revalidatePath('/wallet');
    }

    return result;

  } catch (error: any) {
    return { success: false, message: error.message || 'Ocorreu um erro ao processar sua aposta.' };
  } finally {
    await mongoSession.endSession();
  }
}
