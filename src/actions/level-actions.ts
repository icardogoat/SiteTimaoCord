'use server';

import clientPromise from '@/lib/mongodb';
import type { LevelThreshold } from '@/types';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';

const CONFIG_ID = new ObjectId('66a500a8a7c3d2e3c4f5b6a8'); // Fixed ID for the single level config document

const DEFAULT_LEVELS: LevelThreshold[] = [
    { level: 1, xp: 0, name: 'Iniciante' },
    { level: 2, xp: 500, name: 'Amador' },
    { level: 3, xp: 1500, name: 'Regular' },
    { level: 4, xp: 3000, name: 'Experiente' },
    { level: 5, xp: 5000, name: 'Veterano' },
    { level: 6, xp: 10000, name: 'Mestre' },
    { level: 7, xp: 20000, name: 'Grão-Mestre' },
    { level: 8, xp: 40000, name: 'Lendário' },
    { level: 9, xp: 75000, name: 'Mítico' },
    { level: 10, xp: 150000, name: 'Divino' },
];

export const getLevelConfig = cache(async (): Promise<LevelThreshold[]> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const configCollection = db.collection('level_config');

        let config = await configCollection.findOne({ _id: CONFIG_ID });

        if (!config || !config.levels) {
            await configCollection.updateOne(
                { _id: CONFIG_ID },
                { $set: { levels: DEFAULT_LEVELS } },
                { upsert: true }
            );
            return DEFAULT_LEVELS;
        }

        return config.levels as LevelThreshold[];
    } catch (error) {
        console.error('Error fetching level config:', error);
        return DEFAULT_LEVELS;
    }
});

export async function updateLevelConfig(levels: LevelThreshold[]): Promise<{ success: boolean; message: string }> {
    // Basic validation
    if (!Array.isArray(levels) || levels.length === 0) {
        return { success: false, message: 'Dados de nível inválidos.' };
    }
    if (levels[0].level !== 1 || levels[0].xp !== 0) {
         return { success: false, message: 'O nível 1 deve sempre começar com 0 XP.' };
    }
    for(let i = 1; i < levels.length; i++) {
        if(levels[i].xp <= levels[i-1].xp) {
            return { success: false, message: `O XP para o nível ${levels[i].level} deve ser maior que o do nível anterior.` };
        }
        if(levels[i].level !== levels[i-1].level + 1) {
            return { success: false, message: 'Os níveis devem ser sequenciais.' };
        }
    }


    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const configCollection = db.collection('level_config');

        await configCollection.updateOne(
            { _id: CONFIG_ID },
            { $set: { levels: levels } },
            { upsert: true }
        );

        revalidatePath('/admin/level');
        revalidatePath('/profile');
        revalidatePath('/ranking');

        return { success: true, message: 'Configuração de níveis salva com sucesso!' };
    } catch (error) {
        console.error("Error updating level config:", error);
        return { success: false, message: 'Falha ao salvar a configuração de níveis.' };
    }
}
