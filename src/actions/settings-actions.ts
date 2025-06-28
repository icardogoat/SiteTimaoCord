'use server';

import clientPromise from '@/lib/mongodb';
import type { ApiKeyEntry, SiteSettings, ApiSettings } from '@/types';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';

const SETTINGS_ID = '66a4f2b9a7c3d2e3c4f5b6a7'; // A fixed ID for the single settings document

// Helper function to reset API key usage if a new day has started
const resetApiKeysUsage = (keys: ApiKeyEntry[] | undefined): [ApiKeyEntry[], boolean] => {
    if (!keys) return [[], false];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    let keysWereReset = false;

    const updatedKeys = keys.map(k => {
        const lastReset = k.lastReset ? new Date(k.lastReset) : new Date(0);
        if (lastReset < today) {
            keysWereReset = true;
            return { ...k, usage: 0, lastReset: today.toISOString() };
        }
        return k;
    });

    return [updatedKeys, keysWereReset];
};


export async function getApiSettings(): Promise<Partial<ApiSettings>> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_settings');
        const settingsCollection = db.collection('api_settings');
        const settings = await settingsCollection.findOne({ _id: new ObjectId(SETTINGS_ID) });

        const [updateApiKeys, updateKeysWereReset] = resetApiKeysUsage(settings?.updateApiKeys);
        const [paymentApiKeys, paymentKeysWereReset] = resetApiKeysUsage(settings?.paymentApiKeys);

        if (updateKeysWereReset || paymentKeysWereReset) {
            await settingsCollection.updateOne(
                { _id: new ObjectId(SETTINGS_ID) },
                { $set: { updateApiKeys, paymentApiKeys } }
            );
        }

        return {
            siteUrl: settings?.siteUrl || process.env.NEXTAUTH_URL || '',
            updateApiKeys: updateApiKeys,
            paymentApiKeys: paymentApiKeys,
            lastUpdateTimestamp: settings?.lastUpdateTimestamp || null,
        };
    } catch (error) {
        console.error("Error fetching API settings:", error);
        return {
            siteUrl: process.env.NEXTAUTH_URL || '',
            updateApiKeys: [],
            paymentApiKeys: [],
            lastUpdateTimestamp: null,
        };
    }
}

type UpdateSettingsData = {
    siteUrl: string;
    updateApiKeys: { key: string }[];
    paymentApiKeys: { key: string }[];
};

export async function updateApiSettings(data: UpdateSettingsData): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_settings');
        const settingsCollection = db.collection('api_settings');
        const currentSettings = await settingsCollection.findOne({ _id: new ObjectId(SETTINGS_ID) });

        const mapAndPreserveKeys = (newKeys: {key: string}[], existingKeys: ApiKeyEntry[] | undefined) => {
            const existingKeysMap = new Map((existingKeys || []).map(k => [k.key, k]));
            return newKeys
                .filter(k => k.key)
                .map(k => {
                    if (existingKeysMap.has(k.key)) {
                        return existingKeysMap.get(k.key)!;
                    }
                    return {
                        id: randomBytes(8).toString('hex'),
                        key: k.key,
                        usage: 0,
                        lastReset: new Date(0).toISOString(),
                    };
                });
        };

        const newUpdateApiKeys = mapAndPreserveKeys(data.updateApiKeys, currentSettings?.updateApiKeys);
        const newPaymentApiKeys = mapAndPreserveKeys(data.paymentApiKeys, currentSettings?.paymentApiKeys);
            
        await settingsCollection.updateOne(
            { _id: new ObjectId(SETTINGS_ID) },
            { $set: { 
                siteUrl: data.siteUrl, 
                updateApiKeys: newUpdateApiKeys,
                paymentApiKeys: newPaymentApiKeys,
            } },
            { upsert: true }
        );

        revalidatePath('/admin/settings');
        return { success: true, message: 'Configurações salvas com sucesso!' };
    } catch (error) {
        console.error("Error updating API settings:", error);
        return { success: false, message: 'Falha ao salvar as configurações.' };
    }
}

async function getAvailableKeyFromPool(keyPool: 'updateApiKeys' | 'paymentApiKeys'): Promise<string> {
    const client = await clientPromise;
    const db = client.db('timaocord_settings');
    const settingsCollection = db.collection('api_settings');
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let settings = await settingsCollection.findOne({ _id: new ObjectId(SETTINGS_ID) });

    if (!settings || !settings[keyPool] || settings[keyPool].length === 0) {
        if (process.env.API_FOOTBALL_KEY) {
            console.warn(`No keys in pool '${keyPool}'. Using API_FOOTBALL_KEY from .env as a fallback.`);
            return process.env.API_FOOTBALL_KEY;
        }
        throw new Error(`Nenhuma chave de API configurada no painel de admin para a função '${keyPool}' e nenhuma chave de fallback encontrada no .env.`);
    }

    const [keys, keysNeedReset] = resetApiKeysUsage(settings[keyPool]);
    if (keysNeedReset) {
         await settingsCollection.updateOne(
            { _id: new ObjectId(SETTINGS_ID) },
            { $set: { [keyPool]: keys } }
        );
        settings = { ...settings, [keyPool]: keys };
    }

    const sortedKeys = keys.sort((a: any, b: any) => a.usage - b.usage);
    const availableKey = sortedKeys.find((k: any) => k.usage < 90);

    if (!availableKey) {
        throw new Error(`Todas as chaves de API para '${keyPool}' atingiram o limite de uso diário.`);
    }
    
    // Increment usage for the specific key in the specific pool
    const updateQuery = { $inc: { [`${keyPool}.$.usage`]: 1 } };
    const arrayFilter = { 'arrayFilters': [{ 'elem.id': availableKey.id }] };

    await settingsCollection.updateOne(
        { _id: new ObjectId(SETTINGS_ID), [`${keyPool}.id`]: availableKey.id },
        updateQuery,
        // The arrayFilters syntax is more robust for nested arrays if needed, but this works for simple arrays.
        // For direct updates to nested array elements without arrayFilters, you might need a different approach.
        // However, the positional $ operator is the standard way. Let's adjust to be safer.
    );
     // Correcting the update to use positional operator on the found key.
    await settingsCollection.updateOne(
        { _id: new ObjectId(SETTINGS_ID), [`${keyPool}.id`]: availableKey.id },
        { $inc: { [`${keyPool}.$.usage`]: 1 } }
    );


    return availableKey.key;
}

export const getAvailableUpdateApiKey = () => getAvailableKeyFromPool('updateApiKeys');
export const getAvailablePaymentApiKey = () => getAvailableKeyFromPool('paymentApiKeys');


export async function setLastUpdateTimestamp(): Promise<void> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_settings');
        const settingsCollection = db.collection('api_settings');
        await settingsCollection.updateOne(
            { _id: new ObjectId(SETTINGS_ID) },
            { $set: { lastUpdateTimestamp: new Date() } },
            { upsert: true }
        );
    } catch (error) {
        console.error('Failed to set last update timestamp:', error);
    }
}

// Function to get general site settings
export async function getSiteSettings() {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_settings');
        const settingsCollection = db.collection('site_settings');
        const settings = await settingsCollection.findOne({});
        
        return {
            maintenanceMode: settings?.maintenanceMode ?? false,
            maintenanceMessage: settings?.maintenanceMessage ?? 'O site está em manutenção. Voltamos em breve!',
            maintenanceExpectedReturn: settings?.maintenanceExpectedReturn ?? '',
            betaVipMode: settings?.betaVipMode ?? false,
            welcomeBonus: settings?.welcomeBonus ?? 1000,
        };
    } catch (error) {
        console.error("Error fetching site settings:", error);
        return {
            maintenanceMode: false,
            maintenanceMessage: 'O site está em manutenção. Voltamos em breve!',
            maintenanceExpectedReturn: '',
            betaVipMode: false,
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
        const db = client.db('timaocord_settings');
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

export async function updateBetaVipSettings(data: {
    betaVipMode: boolean;
}) {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_settings');
        const settingsCollection = db.collection('site_settings');

        await settingsCollection.updateOne(
            {},
            { $set: data },
            { upsert: true }
        );

        revalidatePath('/admin/settings');
        revalidatePath('/'); // Revalidate root for middleware checks

        return { success: true, message: 'Configurações de modo beta atualizadas!' };
    } catch (error) {
        console.error("Error updating beta vip settings:", error);
        return { success: false, message: 'Falha ao salvar as configurações.' };
    }
}
