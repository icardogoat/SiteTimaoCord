'use server';

import { getBotConfig } from '@/actions/bot-config-actions';
import AdminBotConfigClient from '@/components/admin-bot-config-client';

export default async function AdminBotConfigPage() {
    const config = await getBotConfig();
    return <AdminBotConfigClient initialConfig={config} />;
}
