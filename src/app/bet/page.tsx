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
import type { Match } from '@/types';

const matches: Match[] = [
  {
    id: 1,
    teamA: { name: 'Corinthians', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Palmeiras', logo: 'https://placehold.co/40x40.png' },
    time: 'Hoje, 21:00',
    league: 'Brasileirão Série A',
    markets: [
      {
        name: 'Vencedor da Partida',
        odds: [
          { label: 'Casa', value: '2.50' },
          { label: 'Empate', value: '3.20' },
          { label: 'Fora', value: '2.90' },
        ],
      },
      {
        name: 'Gols Acima/Abaixo',
        odds: [
          { label: 'Acima 1.5', value: '1.30' },
          { label: 'Abaixo 1.5', value: '3.50' },
          { label: 'Acima 2.5', value: '1.90' },
          { label: 'Abaixo 2.5', value: '1.90' },
        ],
      },
      {
        name: 'Ambos Marcam',
        odds: [
          { label: 'Sim', value: '1.72' },
          { label: 'Não', value: '2.00' },
        ],
      },
      {
        name: 'Dupla Chance',
        odds: [
          { label: 'Casa ou Empate', value: '1.40' },
          { label: 'Fora ou Empate', value: '1.53' },
          { label: 'Casa ou Fora', value: '1.33' },
        ],
      },
      {
        name: 'Placar Exato',
        odds: [
          { label: '1-0', value: '7.00' },
          { label: '2-1', value: '9.00' },
          { label: '0-0', value: '10.00' },
          { label: '1-1', value: '6.00' },
        ]
      }
    ],
  },
  {
    id: 2,
    teamA: { name: 'Flamengo', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Vasco da Gama', logo: 'https://placehold.co/40x40.png' },
    time: 'Amanhã, 16:00',
    league: 'Campeonato Carioca',
    markets: [
      {
        name: 'Vencedor da Partida',
        odds: [
          { label: 'Casa', value: '1.80' },
          { label: 'Empate', value: '3.50' },
          { label: 'Fora', value: '4.50' },
        ],
      },
      {
        name: 'Gols Acima/Abaixo',
        odds: [
          { label: 'Acima 2.5', value: '2.00' },
          { label: 'Abaixo 2.5', value: '1.80' },
        ],
      },
    ],
  },
  {
    id: 3,
    teamA: { name: 'Real Madrid', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Barcelona', logo: 'https://placehold.co/40x40.png' },
    time: '24/05, 17:00',
    league: 'La Liga',
    markets: [
      {
        name: 'Vencedor da Partida',
        odds: [
          { label: 'Casa', value: '2.10' },
          { label: 'Empate', value: '3.40' },
          { label: 'Fora', value: '3.30' },
        ],
      },
    ],
  },
  {
    id: 4,
    teamA: { name: 'Manchester City', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Liverpool', logo: 'https://placehold.co/40x40.png' },
    time: '25/05, 12:30',
    league: 'Premier League',
    markets: [
      {
        name: 'Vencedor da Partida',
        odds: [
          { label: 'Casa', value: '1.95' },
          { label: 'Empate', value: '3.60' },
          { label: 'Fora', value: '3.80' },
        ],
      },
    ],
  },
  {
    id: 5,
    teamA: { name: 'Bayern München', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Borussia Dortmund', logo: 'https://placehold.co/40x40.png' },
    time: '25/05, 14:30',
    league: 'Bundesliga',
    markets: [
      {
        name: 'Vencedor da Partida',
        odds: [
          { label: 'Casa', value: '1.50' },
          { label: 'Empate', value: '4.50' },
          { label: 'Fora', value: '6.00' },
        ],
      },
    ],
  },
  {
    id: 6,
    teamA: { name: 'Paris Saint-Germain', logo: 'https://placehold.co/40x40.png' },
    teamB: { name: 'Olympique de Marseille', logo: 'https://placehold.co/40x40.png' },
    time: '26/05, 20:00',
    league: 'Ligue 1',
    markets: [
      {
        name: 'Vencedor da Partida',
        odds: [
          { label: 'Casa', value: '1.40' },
          { label: 'Empate', value: '5.00' },
          { label: 'Fora', value: '7.50' },
        ],
      },
    ],
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
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
