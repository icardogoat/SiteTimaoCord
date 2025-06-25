'use server';

import { getBotConfig, getGuildDetails } from '@/actions/bot-config-actions';
import { AdminServerPanelClient } from '@/components/admin-server-panel-client';
import type { GuildDetails } from '@/actions/bot-config-actions';

export default async function AdminServerPage() {
    const config = await getBotConfig();
    
    let guildDetails: GuildDetails | null = null;
    let error: string | null = null;

    if (config.guildId) {
        const result = await getGuildDetails(config.guildId);
        if (result.success && result.data) {
            guildDetails = result.data;
        } else {
            error = result.error ?? 'Falha ao carregar os dados do servidor.';
        }
    } else {
        error = "O ID do Servidor não está configurado. Por favor, configure na aba 'Bot'.";
    }

    return (
        <AdminServerPanelClient
            initialGuildDetails={guildDetails}
            error={error}
        />
    );
}
