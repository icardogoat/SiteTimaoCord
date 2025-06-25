'use server';

import { getBotConfig, getDiscordServerDetails } from '@/actions/bot-config-actions';
import AdminBotConfigClient from '@/components/admin-bot-config-client';

export default async function AdminBotConfigPage() {
    const config = await getBotConfig();
    
    let serverDetails = { channels: [], roles: [] };
    if (config.guildId) {
        const result = await getDiscordServerDetails(config.guildId);
        if (result.success && result.data) {
            serverDetails = result.data;
        }
    }
    
    return (
        <AdminBotConfigClient 
            initialConfig={config} 
            initialChannels={serverDetails.channels}
            initialRoles={serverDetails.roles}
        />
    );
}
