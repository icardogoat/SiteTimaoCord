import { AppLayout } from "@/components/app-layout";
import { PlacedBetCard } from "@/components/placed-bet-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PlacedBet } from "@/types";

const placedBets: PlacedBet[] = [
    {
        id: '1',
        teamA: 'Corinthians',
        teamB: 'Palmeiras',
        league: 'Brasileirão Série A',
        marketName: 'Vencedor da Partida',
        selection: 'Casa',
        oddValue: '2.50',
        stake: 10.00,
        potentialWinnings: 25.00,
        status: 'Em Aberto',
        matchTime: 'Hoje, 21:00',
    },
    {
        id: '2',
        teamA: 'Flamengo',
        teamB: 'Vasco da Gama',
        league: 'Campeonato Carioca',
        marketName: 'Ambos Marcam (BTTS)',
        selection: 'Sim',
        oddValue: '1.85',
        stake: 20.00,
        potentialWinnings: 37.00,
        status: 'Em Aberto',
        matchTime: 'Amanhã, 16:00',
    },
    {
        id: '3',
        teamA: 'Real Madrid',
        teamB: 'Barcelona',
        league: 'La Liga',
        marketName: 'Gols Acima/Abaixo',
        selection: 'Acima 2.5',
        oddValue: '1.70',
        stake: 50.00,
        potentialWinnings: 85.00,
        status: 'Ganha',
        matchTime: '24/05, 17:00',
        finalResult: '3-1',
    },
    {
        id: '4',
        teamA: 'Manchester City',
        teamB: 'Liverpool',
        league: 'Premier League',
        marketName: 'Vencedor da Partida',
        selection: 'Fora',
        oddValue: '3.80',
        stake: 15.00,
        potentialWinnings: 57.00,
        status: 'Perdida',
        matchTime: '25/05, 12:30',
        finalResult: '2-1',
    },
];


export default function MyBetsPage() {
    const openBets = placedBets.filter(bet => bet.status === 'Em Aberto');
    const settledBets = placedBets.filter(bet => bet.status !== 'Em Aberto');

    return (
        <AppLayout>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Minhas Apostas</h1>
                    <p className="text-muted-foreground">Acompanhe suas apostas abertas e resolvidas.</p>
                </div>

                <Tabs defaultValue="open">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="open">Em Aberto</TabsTrigger>
                        <TabsTrigger value="settled">Resolvidas</TabsTrigger>
                    </TabsList>
                    <TabsContent value="open">
                        <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
                            {openBets.length > 0 ? (
                                openBets.map(bet => <PlacedBetCard key={bet.id} bet={bet} />)
                            ) : (
                                <p className="text-muted-foreground col-span-full">Você não tem apostas em aberto.</p>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="settled">
                        <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
                            {settledBets.length > 0 ? (
                                settledBets.map(bet => <PlacedBetCard key={bet.id} bet={bet} />)
                            ) : (
                                <p className="text-muted-foreground col-span-full">Você não tem apostas resolvidas.</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </AppLayout>
    )
}
