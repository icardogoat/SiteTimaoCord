import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { FielBetLogo } from '@/components/icons';
import { Header } from '@/components/header';
import { MatchCard } from '@/components/match-card';
import { ChampionshipSidebarMenu } from '@/components/championship-sidebar-menu';

const matches = [
  {
    teamA: { name: 'Corinthians', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Palmeiras', logo: 'https://placehold.co/40x40.png' },
    time: 'Hoje, 21:00',
    league: 'Brasileirão Série A',
    odds: { home: '2.50', draw: '3.20', away: '2.90' },
  },
  {
    teamA: { name: 'Flamengo', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Vasco da Gama', logo: 'https://placehold.co/40x40.png' },
    time: 'Amanhã, 16:00',
    league: 'Campeonato Carioca',
    odds: { home: '1.80', draw: '3.50', away: '4.50' },
  },
  {
    teamA: { name: 'Real Madrid', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Barcelona', logo: 'https://placehold.co/40x40.png' },
    time: '24/05, 17:00',
    league: 'La Liga',
    odds: { home: '2.10', draw: '3.40', away: '3.30' },
  },
  {
    teamA: { name: 'Manchester City', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Liverpool', logo: 'https://placehold.co/40x40.png' },
    time: '25/05, 12:30',
    league: 'Premier League',
    odds: { home: '1.95', draw: '3.60', away: '3.80' },
  },
  {
    teamA: { name: 'Bayern München', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Borussia Dortmund', logo: 'https://placehold.co/40x40.png' },
    time: '25/05, 14:30',
    league: 'Bundesliga',
    odds: { home: '1.50', draw: '4.50', away: '6.00' },
  },
  {
    teamA: { name: 'Paris Saint-Germain', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Olympique de Marseille', logo: 'https://placehold.co/40x40.png' },
    time: '26/05, 20:00',
    league: 'Ligue 1',
    odds: { home: '1.40', draw: '5.00', away: '7.50' },
  },
];

export default function BetPage() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <FielBetLogo className="size-7 text-primary" />
            <h2 className="text-lg font-semibold font-headline text-primary">FielBet</h2>
            <div className="grow" />
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Campeonatos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <ChampionshipSidebarMenu />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Próximas Partidas</h1>
            <p className="text-muted-foreground">Os jogos mais quentes para você apostar.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match, index) => (
              <MatchCard key={index} match={match} />
            ))}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
