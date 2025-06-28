
'use server';

import { getBotConfig, getGuildDetails, getRoleMemberCounts } from '@/actions/bot-config-actions';
import { getDbStats } from '@/actions/admin-actions';
import { AdminServerPanelClient } from '@/components/admin-server-panel-client';
import type { GuildDetails, RoleWithMemberCount, DbStats } from '@/types';

export default async function AdminServerPage() {
    const config = await getBotConfig();
    
    let guildDetails: GuildDetails | null = null;
    let rolesWithCounts: RoleWithMemberCount[] = [];
    let dbStats: DbStats | null = null;
    let error: string | null = null;

    if (config.guildId) {
        const [detailsResult, rolesResult, dbStatsResult] = await Promise.all([
            getGuildDetails(config.guildId),
            getRoleMemberCounts(config.guildId),
            getDbStats(),
        ]);

        if (detailsResult.success && detailsResult.data) {
            guildDetails = detailsResult.data;
        } else {
            error = detailsResult.error ?? 'Falha ao carregar os dados do servidor.';
        }

        if (rolesResult.success && rolesResult.data) {
            rolesWithCounts = rolesResult.data;
        } else {
            const rolesError = rolesResult.error ?? 'Falha ao carregar a contagem de membros por cargo.';
            error = error ? `${error}\n${rolesError}` : rolesError;
        }
        
        if (dbStatsResult.success && dbStatsResult.data) {
            dbStats = dbStatsResult.data;
        } else {
            const dbError = dbStatsResult.error ?? 'Falha ao carregar estatísticas do banco de dados.';
            error = error ? `${error}\n${dbError}` : dbError;
        }

    } else {
        error = "O ID do Servidor não está configurado. Por favor, configure na aba 'Bot'.";
    }

    return (
        <AdminServerPanelClient
            initialGuildDetails={guildDetails}
            initialRolesWithCounts={rolesWithCounts}
            initialDbStats={dbStats}
            error={error}
        />
    );
}
