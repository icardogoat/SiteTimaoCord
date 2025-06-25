'use server';

import clientPromise from '@/lib/mongodb';
import type { BotConfig } from '@/types';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

const CONFIG_ID = '669fdb5a907548817b848c48';

export async function getBotConfig(): Promise<Partial<BotConfig>> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_bot');
        const configCollection = db.collection('config');

        const config = await configCollection.findOne({ _id: new ObjectId(CONFIG_ID) });

        if (!config) {
            return {
                welcomeChannelId: '',
                logChannelId: '',
                bettingChannelId: '',
                adminRoleId: '',
            };
        }

        return {
            _id: config._id.toString(),
            welcomeChannelId: config.welcomeChannelId || '',
            logChannelId: config.logChannelId || '',
            bettingChannelId: config.bettingChannelId || '',
            adminRoleId: config.adminRoleId || '',
        };
    } catch (error) {
        console.error("Error fetching bot config:", error);
        return {
            welcomeChannelId: '',
            logChannelId: '',
            bettingChannelId: '',
            adminRoleId: '',
        };
    }
}

type UpdateConfigData = {
    welcomeChannelId: string;
    logChannelId: string;
    bettingChannelId: string;
    adminRoleId: string;
};

export async function updateBotConfig(data: UpdateConfigData): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_bot');
        const configCollection = db.collection('config');

        await configCollection.updateOne(
            { _id: new ObjectId(CONFIG_ID) },
            { $set: data },
            { upsert: true }
        );

        revalidatePath('/admin/bot');
        return { success: true, message: 'Configuração do bot salva com sucesso!' };
    } catch (error) {
        console.error("Error updating bot config:", error);
        return { success: false, message: 'Falha ao salvar a configuração do bot.' };
    }
}
