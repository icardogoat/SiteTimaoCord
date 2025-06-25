'use server';

import clientPromise from '@/lib/mongodb';
import type { ApiSettings } from '@/types';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

const SETTINGS_ID = '66a4f2b9a7c3d2e3c4f5b6a7'; // A fixed ID for the single settings document

export async function getApiSettings(): Promise<Partial<ApiSettings>> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const settingsCollection = db.collection('api_settings');

        const settings = await settingsCollection.findOne({ _id: new ObjectId(SETTINGS_ID) });

        // If there's a key in the database, use it. Otherwise, fallback to the .env variable.
        const apiKey = settings?.apiFootballKey || process.env.API_FOOTBALL_KEY || '';

        return {
            _id: settings?._id.toString() || SETTINGS_ID,
            apiFootballKey: apiKey,
        };
    } catch (error) {
        console.error("Error fetching API settings:", error);
        return {
            apiFootballKey: process.env.API_FOOTBALL_KEY || '',
        };
    }
}

type UpdateSettingsData = {
    apiFootballKey: string;
};

export async function updateApiSettings(data: UpdateSettingsData): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const settingsCollection = db.collection('api_settings');

        await settingsCollection.updateOne(
            { _id: new ObjectId(SETTINGS_ID) },
            { $set: data },
            { upsert: true }
        );

        revalidatePath('/admin/settings');
        return { success: true, message: 'Configurações de API salvas com sucesso!' };
    } catch (error) {
        console.error("Error updating API settings:", error);
        return { success: false, message: 'Falha ao salvar as configurações de API.' };
    }
}
