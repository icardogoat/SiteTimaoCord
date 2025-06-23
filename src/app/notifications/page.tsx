import { AppLayout } from "@/components/app-layout";
import { NotificationItem } from "@/components/notification-item";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Notification } from "@/types";

const notifications: Notification[] = [
    {
        id: '1',
        title: 'Aposta Ganha!',
        description: 'Sua aposta em Corinthians vs Palmeiras foi vitoriosa.',
        time: '5 min atrás',
        read: false,
    },
    {
        id: '2',
        title: 'Novo Bônus Disponível',
        description: 'Você recebeu um bônus de R$20 para apostar.',
        time: '2 horas atrás',
        read: false,
    },
    {
        id: '3',
        title: 'Lembrete de Partida',
        description: 'Flamengo vs Vasco da Gama começa em 1 hora.',
        time: '1 dia atrás',
        read: true,
    },
    {
        id: '4',
        title: 'Aposta Resolvida',
        description: 'Sua aposta em Real Madrid vs Barcelona foi marcada como "Ganha".',
        time: '2 dias atrás',
        read: true,
    },
    {
        id: '5',
        title: 'Saque Concluído',
        description: 'Seu saque de R$ 150,00 foi processado com sucesso.',
        time: '3 dias atrás',
        read: true,
    },
];

export default function NotificationsPage() {
    return (
        <AppLayout>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Notificações</h1>
                    <p className="text-muted-foreground">Veja todas as suas notificações aqui.</p>
                </div>

                <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>Todas as Notificações</CardTitle>
                        <CardDescription>Clique em uma notificação para marcá-la como lida.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {notifications.length > 0 ? (
                                notifications.map(notification => <NotificationItem key={notification.id} notification={notification} />)
                            ) : (
                                <p className="p-6 text-center text-muted-foreground">Nenhuma notificação encontrada.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    )
}
