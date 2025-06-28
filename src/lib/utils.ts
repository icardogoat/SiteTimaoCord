import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const marketNameTranslations: { [key: string]: string } = {
    'Match Winner': 'Vencedor da Partida',
    'Home/Away': 'Aposta sem Empate',
    'Second Half Winner': 'Vencedor do 2º Tempo',
    'Goals Over/Under': 'Gols Acima/Abaixo',
    'Goals Over/Under First Half': 'Gols Acima/Abaixo (1º Tempo)',
    'Goals Over/Under - Second Half': 'Gols Acima/Abaixo (2º Tempo)',
    'HT/FT Double': 'Intervalo/Final de Jogo',
    'Both Teams Score': 'Ambos Marcam',
    'Handicap Result': 'Resultado com Handicap',
    'Exact Score': 'Placar Exato',
    'Correct Score - First Half': 'Placar Exato (1º Tempo)',
    'Double Chance': 'Dupla Chance',
    'First Half Winner': 'Vencedor do 1º Tempo',
    'Total - Home': 'Total de Gols da Casa',
    'Total - Away': 'Total de Gols do Visitante',
    'Double Chance - First Half': 'Dupla Chance (1º Tempo)',
    'Double Chance - Second Half': 'Dupla Chance (2º Tempo)',
    'Odd/Even': 'Ímpar/Par',
    'Corners 1x2': 'Escanteios 1x2',
    'Corners Over Under': 'Escanteios Acima/Abaixo',
    'Home Team Total Goals(1st Half)': 'Total de Gols da Casa (1º Tempo)',
    'Away Team Total Goals(1st Half)': 'Total de Gols do Visitante (1º Tempo)',
    'Draw No Bet (1st Half)': 'Aposta sem Empate (1º Tempo)',
    'Draw No Bet (2nd Half)': 'Aposta sem Empate (2º Tempo)',
    'Home Corners Over/Under': 'Escanteios da Casa Acima/Abaixo',
    'Away Corners Over/Under': 'Escanteios do Visitante Acima/Abaixo',
    'Total Corners (1st Half)': 'Total de Escanteios (1º Tempo)',
    'Cards Over/Under': 'Cartões Acima/Abaixo',
};

const oddsLabelTranslations: { [key: string]: string } = {
    'Home': 'Casa',
    'Draw': 'Empate',
    'Away': 'Fora',
    'Yes': 'Sim',
    'No': 'Não',
    'Odd': 'Ímpar',
    'Even': 'Par',
};

const translateComplexLabel = (label: string, marketName: string): string => {
    if (marketName.includes('Double Chance')) {
        return label.replace('Home', 'Casa').replace('Away', 'Fora').replace('Draw', 'Empate').replace('/', ' ou ');
    }
    if (marketName === 'HT/FT Double') {
        return label.replace('Home', 'Casa').replace('Away', 'Fora').replace('Draw', 'Empate');
    }
    // For Over/Under, Handicap, etc.
    return label.replace('Over', 'Acima').replace('Under', 'Abaixo').replace('Home', 'Casa').replace('Away', 'Fora');
};

export const translateMarketData = (market: { name: string; odds: { label: string; value: string }[] }) => {
    const translatedMarketName = marketNameTranslations[market.name] || market.name;

    const translatedOdds = market.odds.map(odd => {
        const simpleTranslation = oddsLabelTranslations[odd.label];
        if (simpleTranslation) {
            return { ...odd, label: simpleTranslation };
        }
        return { ...odd, label: translateComplexLabel(odd.label, market.name) };
    });

    return {
        ...market,
        name: translatedMarketName,
        odds: translatedOdds,
    };
};
