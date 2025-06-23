export type Team = {
  name: string;
  logo: string;
};

export type Odd = {
  label: string;
  value: string;
};

export type Market = {
  name: string;
  odds: Odd[];
};

export type Match = {
  id: number;
  teamA: Team;
  teamB: Team;
  time: string;
  league: string;
  markets: Market[];
};

export type Bet = {
  id: string; // A unique identifier for the bet, e.g., `${match.id}-${market.name}-${odd.label}`
  matchId: number;
  matchTime: string;
  teamA: string;
  teamB: string;
  marketName: string;
  odd: Odd;
};

export type PlacedBet = {
  id: string;
  teamA: string;
  teamB: string;
  league: string;
  marketName: string;
  selection: string;
  oddValue: string;
  stake: number;
  potentialWinnings: number;
  status: 'Em Aberto' | 'Ganha' | 'Perdida';
  matchTime: string;
  finalResult?: string;
};

export type Notification = {
    id: string;
    title: string;
    description: string;
    time: string;
    read: boolean;
};

export type UserRanking = {
  rank: number;
  avatar: string;
  name: string;
  winnings: number;
};

export type Transaction = {
  id: string;
  type: 'Depósito' | 'Saque' | 'Aposta' | 'Prêmio';
  description: string;
  amount: number;
  date: string;
  status: 'Concluído' | 'Pendente' | 'Cancelado';
};
