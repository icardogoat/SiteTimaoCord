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
        const siteUrl = settings?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '';


        return {
            _id: settings?._id.toString() || SETTINGS_ID,
            apiFootballKey: apiKey,
            siteUrl: siteUrl,
        };
    } catch (error) {
        console.error("Error fetching API settings:", error);
        return {
            apiFootballKey: process.env.API_FOOTBALL_KEY || '',
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
        };
    }
}

type UpdateSettingsData = {
    apiFootballKey: string;
    siteUrl: string;
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
        return { success: true, message: 'Configurações salvas com sucesso!' };
    } catch (error) {
        console.error("Error updating API settings:", error);
        return { success: false, message: 'Falha ao salvar as configurações.' };
    }
}
