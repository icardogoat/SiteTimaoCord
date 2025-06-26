'use server';

import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Transaction, StoreItem, UserInventoryItem } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';

// This function returns serializable store item data for the public store page.
export async function getStoreItems(): Promise<Omit<StoreItem, '_id' | 'createdAt'> & { id: string }[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const items = await db.collection<StoreItem>('store_items')
            .find({ isActive: true })
            .sort({ price: 1 })
            .toArray();

        // Convert to serializable format
        return items.map(item => ({
            id: item._id.toString(),
            name: item.name,
            description: item.description,
            price: item.price,
            type: item.type,
            duration: item.duration,
            durationInDays: item.durationInDays,
            roleId: item.roleId,
            xpAmount: item.xpAmount,
            isActive: item.isActive,
        }));
    } catch (error) {
        console.error("Error fetching store items:", error);
        return [];
    }
};

export async function getUserInventory(userId: string): Promise<UserInventoryItem[]> {
    if (!userId) return [];
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const inventory = await db.collection<UserInventoryItem>('user_inventory')
            .find({ userId })
            .toArray();

        // Convert to serializable format
        return JSON.parse(JSON.stringify(inventory));
    } catch (error) {
        console.error("Error fetching user inventory:", error);
        return [];
    }
}


interface PurchaseResult {
    success: boolean;
    message: string;
    redemptionCode?: string;
}

const VIP_DISCOUNT_MULTIPLIER = 0.9; // 10% discount

function generateRedemptionCode(): string {
  // Generates a random 8-character uppercase alphanumeric string
  return randomBytes(4).toString('hex').toUpperCase();
}


export async function purchaseItem(itemId: string): Promise<PurchaseResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return { success: false, message: 'Você precisa estar logado para comprar.' };
    }

    const userId = session.user.discordId;
    const isVip = session.user.isVip;

    const client = await clientPromise;
    const db = client.db('timaocord');
    
    const item = await db.collection<StoreItem>('store_items').findOne({ _id: new ObjectId(itemId) });

    if (!item || !item.isActive) {
        return { success: false, message: 'Item não encontrado ou indisponível.' };
    }

    // Check if user already owns an active version of this item
    if (item.type === 'ROLE') {
        const inventoryCollection = db.collection<UserInventoryItem>('user_inventory');
        const userInventory = await inventoryCollection.find({ userId, itemId: item._id }).toArray();

        for (const ownedItem of userInventory) {
            if (ownedItem.itemDuration === 'PERMANENT') {
                return { success: false, message: 'Você já possui este item permanentemente.' };
            }
            if (ownedItem.itemDuration === 'MONTHLY' && ownedItem.expiresAt && new Date(ownedItem.expiresAt) > new Date()) {
                const expiryDate = new Date(ownedItem.expiresAt).toLocaleDateString('pt-BR');
                return { success: false, message: `Você já possui uma assinatura ativa para este item, que expira em ${expiryDate}.` };
            }
        }
    }

    if (item.type === 'AD_REMOVAL') {
        const user = await db.collection('users').findOne({ discordId: userId });
        if (user && user.adRemovalExpiresAt && new Date(user.adRemovalExpiresAt) > new Date()) {
            return { success: false, message: 'Você já possui um período de remoção de anúncios ativo.' };
        }
    }


    const finalPrice = isVip && item.type !== 'ROLE' ? item.price * VIP_DISCOUNT_MULTIPLIER : item.price;

    const mongoSession = client.startSession();

    try {
        let result: PurchaseResult | undefined;

        await mongoSession.withTransaction(async () => {
            const walletsCollection = db.collection('wallets');
            const inventoryCollection = db.collection('user_inventory');
            const usersCollection = db.collection('users');

            const userWallet = await walletsCollection.findOne({ userId }, { session: mongoSession });

            if (!userWallet || userWallet.balance < finalPrice) {
                throw new Error('Saldo insuficiente.');
            }
            
            if (item.type === 'XP_BOOST' && item.xpAmount) {
                 await usersCollection.updateOne(
                    { discordId: userId },
                    { $inc: { xp: item.xpAmount } },
                    { session: mongoSession }
                );
                
                result = { success: true, message: `Bônus de ${item.xpAmount} XP aplicado com sucesso!` };

            } else if (item.type === 'AD_REMOVAL' && item.durationInDays) {
                const now = new Date();
                const expiryDate = new Date(new Date().setDate(now.getDate() + item.durationInDays));
                
                await usersCollection.updateOne(
                    { discordId: userId },
                    { $set: { adRemovalExpiresAt: expiryDate } },
                    { session: mongoSession }
                );
                
                // Add to inventory for tracking in admin
                const newInventoryItem: Omit<UserInventoryItem, '_id'> = {
                    userId: userId,
                    itemId: item._id,
                    itemName: item.name,
                    pricePaid: finalPrice,
                    itemType: item.type,
                    isRedeemed: true, // It's applied directly
                    redeemedAt: new Date(),
                    expiresAt: expiryDate,
                    purchasedAt: new Date(),
                    redemptionCode: 'APLICADO_DIRETAMENTE', // No code needed
                };
                await inventoryCollection.insertOne(newInventoryItem as any, { session: mongoSession });

                result = { success: true, message: `Anúncios removidos por ${item.durationInDays} dia(s)!` };

            } else { // For roles or other redeemable items, generate a code
                 // Generate a unique code
                let redemptionCode = '';
                let isCodeUnique = false;
                while (!isCodeUnique) {
                    redemptionCode = generateRedemptionCode();
                    const existingCode = await inventoryCollection.findOne({ redemptionCode }, { session: mongoSession });
                    if (!existingCode) {
                        isCodeUnique = true;
                    }
                }
                
                const newInventoryItem: Omit<UserInventoryItem, '_id'> = {
                    userId: userId,
                    itemId: item._id,
                    itemName: item.name,
                    pricePaid: finalPrice,
                    itemType: item.type,
                    itemDuration: item.duration,
                    redemptionCode: redemptionCode,
                    isRedeemed: false,
                    purchasedAt: new Date(),
                };

                if (item.duration === 'MONTHLY') {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + 30);
                    newInventoryItem.expiresAt = expiryDate;
                }

                await inventoryCollection.insertOne(newInventoryItem as any, { session: mongoSession });
                
                result = { success: true, message: `"${item.name}" comprado com sucesso!`, redemptionCode };
            }

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
        });
        
        await mongoSession.endSession();

        if (result?.success) {
            revalidatePath('/wallet');
            revalidatePath('/store');
            revalidatePath('/profile'); // Revalidate profile in case of XP/Ad purchase
            revalidatePath('/admin/purchases'); // Revalidate admin purchases view
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao processar sua compra.' };
    }
}
