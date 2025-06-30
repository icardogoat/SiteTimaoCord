
'use server';

import { AdminPlayerGameClient } from '@/components/admin-player-game-client';
import { getPlayerGames } from '@/actions/player-game-actions';
import { getBotConfig, getDiscordServerDetails } from '@/actions/bot-config-actions';

export default async function AdminPlayerGamePage() {
    const games = await getPlayerGames();
    const config = await getBotConfig();

    let error: string | null = null;
    if (!config.playerGameChannelId) {
        error = "O canal do jogo 'Quem é o Jogador?' não está configurado. Por favor, configure-o na aba 'Bot' para iniciar um jogo.";
    }
    
    return <AdminPlayerGameClient initialGames={games} error={error} />;
}
