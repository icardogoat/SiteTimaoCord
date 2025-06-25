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
                guildId: '',
                welcomeChannelId: '',
                logChannelId: '',
                bettingChannelId: '',
                adminRoleId: '',
            };
        }

        return {
            _id: config._id.toString(),
            guildId: config.guildId || '',
            welcomeChannelId: config.welcomeChannelId || '',
            logChannelId: config.logChannelId || '',
            bettingChannelId: config.bettingChannelId || '',
            adminRoleId: config.adminRoleId || '',
        };
    } catch (error) {
        console.error("Error fetching bot config:", error);
        return {
            guildId: '',
            welcomeChannelId: '',
            logChannelId: '',
            bettingChannelId: '',
            adminRoleId: '',
        };
    }
}

type UpdateConfigData = {
    guildId: string;
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


export type DiscordChannel = {
    id: string;
    name: string;
    type: number;
};

export type DiscordRole = {
    id: string;
    name: string;
};

export async function getDiscordServerDetails(guildId: string): Promise<{ success: boolean, data?: { channels: DiscordChannel[]; roles: DiscordRole[] }, error?: string }> {
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        const errorMessage = 'Token do bot do Discord não configurado no servidor.';
        console.error(errorMessage);
        return { success: false, error: errorMessage };
    }
    if (!guildId) {
        return { success: true, data: { channels: [], roles: [] } };
    }

    const headers = { 'Authorization': `Bot ${botToken}` };

    try {
        const [channelsRes, rolesRes] = await Promise.all([
            fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers, cache: 'no-store' }),
            fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers, cache: 'no-store' })
        ]);

        if (!channelsRes.ok) {
            const errorData = await channelsRes.json();
            console.error(`Falha ao buscar canais: ${channelsRes.statusText}`, errorData);
            return { success: false, error: `Falha ao buscar canais: ${errorData.message || channelsRes.statusText}. Verifique o ID do Servidor e as permissões do bot.` };
        }
        if (!rolesRes.ok) {
            const errorData = await rolesRes.json();
            console.error(`Falha ao buscar cargos: ${rolesRes.statusText}`, errorData);
            return { success: false, error: `Falha ao buscar cargos: ${errorData.message || rolesRes.statusText}.` };
        }

        const channels: DiscordChannel[] = await channelsRes.json();
        const roles: DiscordRole[] = await rolesRes.json();

        const textChannels = channels
            .filter(c => c.type === 0)
            .map(c => ({ id: c.id, name: c.name, type: c.type }))
            .sort((a, b) => a.name.localeCompare(b.name));
            
        const sortedRoles = roles
            .filter(r => r.id !== guildId) 
            .map(r => ({ id: r.id, name: r.name }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return { success: true, data: { channels: textChannels, roles: sortedRoles } };

    } catch (error) {
        console.error("Erro ao buscar detalhes do servidor Discord:", error);
        return { success: false, error: (error instanceof Error) ? error.message : 'Ocorreu um erro desconhecido.' };
    }
}
