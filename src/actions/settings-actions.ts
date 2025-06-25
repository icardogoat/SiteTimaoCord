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

        if (!settings) {
            return {
                apiFootballKey: '',
            };
        }

        return {
            _id: settings._id.toString(),
            apiFootballKey: settings.apiFootballKey || '',
        };
    } catch (error) {
        console.error("Error fetching API settings:", error);
        return {
            apiFootballKey: '',
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
