import type { Match } from '@/types';
import { BetPageClient } from '@/components/bet-page-client';

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
        name: 'Vencedor do 2º Tempo',
        odds: [
          { label: 'Casa', value: '2.80' },
          { label: 'Empate', value: '2.50' },
          { label: 'Fora', value: '3.10' },
        ],
      },
      {
        name: 'Gols Acima/Abaixo',
        odds: [
          { label: 'Acima 0.5', value: '1.08' },
          { label: 'Abaixo 0.5', value: '8.00' },
          { label: 'Acima 1.5', value: '1.30' },
          { label: 'Abaixo 1.5', value: '3.50' },
          { label: 'Acima 2.5', value: '1.90' },
          { label: 'Abaixo 2.5', value: '1.90' },
          { label: 'Acima 3.5', value: '3.20' },
          { label: 'Abaixo 3.5', value: '1.35' },
        ],
      },
      {
        name: 'Gols Acima/Abaixo (1º Tempo)',
        odds: [
          { label: 'Acima 0.5', value: '1.40' },
          { label: 'Abaixo 0.5', value: '2.80' },
          { label: 'Acima 1.5', value: '2.50' },
          { label: 'Abaixo 1.5', value: '1.50' },
        ],
      },
      {
        name: 'Gols Acima/Abaixo (2º Tempo)',
        odds: [
          { label: 'Acima 0.5', value: '1.25' },
          { label: 'Abaixo 0.5', value: '3.80' },
          { label: 'Acima 1.5', value: '2.10' },
          { label: 'Abaixo 1.5', value: '1.70' },
        ],
      },
      {
        name: 'Dupla Chance HT/FT',
        odds: [
          { label: 'Casa/Empate', value: '1.40' },
          { label: 'Casa/Fora', value: '1.33' },
          { label: 'Empate/Casa', value: '5.50' },
          { label: 'Empate/Fora', value: '6.00' },
          { label: 'Fora/Casa', value: '25.00' },
          { label: 'Fora/Empate', value: '1.50' },
        ],
      },
      {
        name: 'Ambos Marcam (BTTS)',
        odds: [
          { label: 'Sim', value: '1.72' },
          { label: 'Não', value: '2.00' },
        ],
      },
      {
        name: 'Handicap de Resultado',
        odds: [
          { label: 'Casa -1', value: '4.50' },
          { label: 'Empate -1', value: '3.80' },
          { label: 'Fora +1', value: '1.20' },
          { label: 'Casa +1', value: '1.40' },
          { label: 'Fora -1', value: '5.50' },
        ],
      },
      {
        name: 'Placar Exato',
        odds: [
          { label: '1-0', value: '7.00' },
          { label: '2-1', value: '9.00' },
          { label: '0-0', value: '10.00' },
          { label: '1-1', value: '6.00' },
          { label: '0-1', value: '8.50' },
          { label: '1-2', value: '11.00' },
        ],
      },
      {
        name: 'Placar Exato (1º Tempo)',
        odds: [
          { label: '1-0', value: '4.00' },
          { label: '0-0', value: '2.50' },
          { label: '0-1', value: '4.50' },
          { label: '1-1', value: '9.00' },
        ],
      },
      {
        name: 'Vencedor do 1º Tempo',
        odds: [
          { label: 'Casa', value: '3.20' },
          { label: 'Empate', value: '2.10' },
          { label: 'Fora', value: '3.50' },
        ],
      },
      {
        name: 'Total de Gols da Casa',
        odds: [
          { label: 'Acima 0.5', value: '1.28' },
          { label: 'Abaixo 0.5', value: '3.60' },
          { label: 'Acima 1.5', value: '2.40' },
          { label: 'Abaixo 1.5', value: '1.55' },
        ],
      },
      {
        name: 'Total de Gols do Visitante',
        odds: [
          { label: 'Acima 0.5', value: '1.33' },
          { label: 'Abaixo 0.5', value: '3.20' },
          { label: 'Acima 1.5', value: '2.60' },
          { label: 'Abaixo 1.5', value: '1.48' },
        ],
      },
      {
        name: 'Dupla Chance (1º Tempo)',
        odds: [
          { label: 'Casa ou Empate', value: '1.22' },
          { label: 'Fora ou Empate', value: '1.25' },
          { label: 'Casa ou Fora', value: '1.70' },
        ],
      },
      {
        name: 'Dupla Chance (2º Tempo)',
        odds: [
          { label: 'Casa ou Empate', value: '1.20' },
          { label: 'Fora ou Empate', value: '1.22' },
          { label: 'Casa ou Fora', value: '1.65' },
        ],
      },
      {
        name: 'Ímpar/Par',
        odds: [
          { label: 'Ímpar', value: '1.95' },
          { label: 'Par', value: '1.85' },
        ],
      },
      {
        name: 'Escanteios 1x2',
        odds: [
          { label: 'Casa', value: '1.80' },
          { label: 'Empate', value: '8.00' },
          { label: 'Fora', value: '2.10' },
        ],
      },
      {
        name: 'Escanteios Acima/Abaixo',
        odds: [
          { label: 'Acima 8.5', value: '1.70' },
          { label: 'Abaixo 8.5', value: '2.10' },
          { label: 'Acima 10.5', value: '2.50' },
          { label: 'Abaixo 10.5', value: '1.50' },
        ],
      },
      {
        name: 'Total de Gols da Casa (1º Tempo)',
        odds: [
          { label: 'Acima 0.5', value: '2.00' },
          { label: 'Abaixo 0.5', value: '1.75' },
        ],
      },
      {
        name: 'Total de Gols do Visitante (1º Tempo)',
        odds: [
          { label: 'Acima 0.5', value: '2.10' },
          { label: 'Abaixo 0.5', value: '1.70' },
        ],
      },
      {
        name: 'Aposta sem Empate (1º Tempo)',
        odds: [
          { label: 'Casa', value: '2.20' },
          { label: 'Fora', value: '2.40' },
        ],
      },
      {
        name: 'Aposta sem Empate (2º Tempo)',
        odds: [
          { label: 'Casa', value: '2.00' },
          { label: 'Fora', value: '2.10' },
        ],
      },
      {
        name: 'Escanteios da Casa Acima/Abaixo',
        odds: [
          { label: 'Acima 4.5', value: '1.85' },
          { label: 'Abaixo 4.5', value: '1.95' },
        ],
      },
      {
        name: 'Escanteios do Visitante Acima/Abaixo',
        odds: [
          { label: 'Acima 3.5', value: '1.90' },
          { label: 'Abaixo 3.5', value: '1.90' },
        ],
      },
      {
        name: 'Total de Escanteios (1º Tempo)',
        odds: [
          { label: 'Acima 4.5', value: '1.83' },
          { label: 'Abaixo 4.5', value: '1.93' },
        ],
      },
      {
        name: 'Cartões Acima/Abaixo',
        odds: [
          { label: 'Acima 3.5', value: '1.60' },
          { label: 'Abaixo 3.5', value: '2.30' },
          { label: 'Acima 4.5', value: '2.20' },
          { label: 'Abaixo 4.5', value: '1.65' },
        ],
      },
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
      {
        name: 'Ambos Marcam (BTTS)',
        odds: [
          { label: 'Sim', value: '1.85' },
          { label: 'Não', value: '1.95' },
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
       {
        name: 'Gols Acima/Abaixo',
        odds: [
          { label: 'Acima 2.5', value: '1.70' },
          { label: 'Abaixo 2.5', value: '2.10' },
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
  return <BetPageClient matches={matches} />;
}
