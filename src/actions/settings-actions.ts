
'use server';

import clientPromise from '@/lib/mongodb';
import type { ApiKeyEntry, SiteSettings } from '@/types';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';

const SETTINGS_ID = '66a4f2b9a7c3d2e3c4f5b6a7'; // A fixed ID for the single settings document

export async function getApiSettings(): Promise<{ siteUrl?: string; apiKeys?: ApiKeyEntry[] }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const settingsCollection = db.collection('api_settings');
        const settings = await settingsCollection.findOne({ _id: new ObjectId(SETTINGS_ID) });

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        let keysWereReset = false;
        const apiKeys = (settings?.apiKeys || []).map((k: any) => {
            const lastReset = new Date(k.lastReset);
            if (lastReset < today) {
                keysWereReset = true;
                return { ...k, usage: 0, lastReset: today.toISOString() };
            }
            return k;
        });

        if (keysWereReset) {
            await settingsCollection.updateOne(
                { _id: new ObjectId(SETTINGS_ID) },
                { $set: { apiKeys } }
            );
        }

        return {
            siteUrl: settings?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '',
            apiKeys: apiKeys,
        };
    } catch (error) {
        console.error("Error fetching API settings:", error);
        return {
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
            apiKeys: [],
        };
    }
}

type UpdateSettingsData = {
    siteUrl: string;
    apiKeys: { key: string }[];
};

export async function updateApiSettings(data: UpdateSettingsData): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const settingsCollection = db.collection('api_settings');
        const currentSettings = await settingsCollection.findOne({ _id: new ObjectId(SETTINGS_ID) });

        const existingKeysMap = new Map((currentSettings?.apiKeys || []).map((k: any) => [k.key, k]));
        
        const newApiKeys = data.apiKeys
            .filter(k => k.key) // Filter out empty keys from the form
            .map(k => {
                if (existingKeysMap.has(k.key)) {
                    return existingKeysMap.get(k.key);
                }
                return {
                    id: randomBytes(8).toString('hex'),
                    key: k.key,
                    usage: 0,
                    lastReset: new Date(0).toISOString(),
                };
            });

        await settingsCollection.updateOne(
            { _id: new ObjectId(SETTINGS_ID) },
            { $set: { siteUrl: data.siteUrl, apiKeys: newApiKeys } },
            { upsert: true }
        );

        revalidatePath('/admin/settings');
        return { success: true, message: 'Configurações salvas com sucesso!' };
    } catch (error) {
        console.error("Error updating API settings:", error);
        return { success: false, message: 'Falha ao salvar as configurações.' };
    }
}

export async function getAvailableApiKey(): Promise<string> {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const settingsCollection = db.collection('api_settings');
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let settings = await settingsCollection.findOne({ _id: new ObjectId(SETTINGS_ID) });

    if (!settings || !settings.apiKeys || settings.apiKeys.length === 0) {
        throw new Error('Nenhuma chave de API configurada.');
    }

    const keysNeedReset = settings.apiKeys.some((k: any) => new Date(k.lastReset) < today);
    if (keysNeedReset) {
        const resetKeys = settings.apiKeys.map((k: any) => ({
            ...k,
            usage: 0,
            lastReset: today.toISOString(),
        }));

        await settingsCollection.updateOne(
            { _id: new ObjectId(SETTINGS_ID) },
            { $set: { apiKeys: resetKeys } }
        );
        settings.apiKeys = resetKeys;
    }

    const availableKey = settings.apiKeys.find((k: any) => k.usage < 90);

    if (!availableKey) {
        throw new Error('Todas as chaves de API atingiram o limite de uso diário.');
    }
    
    await settingsCollection.updateOne(
        { _id: new ObjectId(SETTINGS_ID), 'apiKeys.id': availableKey.id },
        { $inc: { 'apiKeys.$.usage': 1 } }
    );

    return availableKey.key;
}


// Function to get general site settings
export async function getSiteSettings() {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const settingsCollection = db.collection('site_settings');
        const settings = await settingsCollection.findOne({});
        
        return {
            maintenanceMode: settings?.maintenanceMode ?? false,
            maintenanceMessage: settings?.maintenanceMessage ?? 'O site está em manutenção. Voltamos em breve!',
            maintenanceExpectedReturn: settings?.maintenanceExpectedReturn ?? '',
            welcomeBonus: settings?.welcomeBonus ?? 1000,
        };
    } catch (error) {
        console.error("Error fetching site settings:", error);
        return {
            maintenanceMode: false,
            maintenanceMessage: 'O site está em manutenção. Voltamos em breve!',
            maintenanceExpectedReturn: '',
            welcomeBonus: 1000,
        };
    }
}


// Function to update general site settings
export async function updateGeneralSiteSettings(data: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    maintenanceExpectedReturn: string;
}) {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const settingsCollection = db.collection('site_settings');
        
        // There is only one settings document, so we can use an empty query to update/upsert it.
        await settingsCollection.updateOne(
            {},
            { $set: data },
            { upsert: true }
        );

        revalidatePath('/admin/settings');
        revalidatePath('/'); // Revalidate root to affect middleware checks

        return { success: true, message: 'Configurações gerais atualizadas com sucesso!' };
    } catch (error) {
        console.error("Error updating site settings:", error);
        return { success: false, message: 'Falha ao salvar as configurações.' };
    }
}
