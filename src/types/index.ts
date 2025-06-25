import type { ObjectId } from "mongodb";

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
  status: string;
  goals: {
    home: number | null;
    away: number | null;
  };
  isFinished: boolean;
  isNotificationSent?: boolean;
  timestamp: number;
};

export type BetInSlip = {
  id: string; 
  matchId: number;
  matchTime: string;
  teamA: string;
  teamB: string;
  league: string;
  marketName: string;
  odd: Odd;
};

export type PlacedBet = {
  _id: string | ObjectId; 
  userId: string;
  bets: { 
    matchId: number;
    matchTime: string;
    teamA: string;
    teamB: string;
    league: string;
    marketName: string;
    selection: string;
    oddValue: string;
    status?: 'Em Aberto' | 'Ganha' | 'Perdida' | 'Anulada';
  }[];
  stake: number;
  potentialWinnings: number;
  totalOdds: number;
  status: 'Em Aberto' | 'Ganha' | 'Perdida' | 'Cancelada';
  createdAt: Date | string;
  settledAt?: Date | string;
};


export type Notification = {
  _id: string | ObjectId;
  userId: string;
  title: string;
  description: string;
  date: Date | string;
  read: boolean;
  link?: string;
};

export type UserRanking = {
  rank: number;
  discordId: string;
  avatar: string;
  name: string;
  winnings: number;
  isVip?: boolean;
};

export type ActiveBettorRanking = {
  rank: number;
  discordId: string;
  avatar: string;
  name: string;
  totalBets: number;
  isVip?: boolean;
};

export type TopLevelUserRanking = {
  rank: number;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  isVip?: boolean;
};

export type RichestUserRanking = {
  rank: number;
  discordId: string;
  avatar: string;
  name: string;
  balance: number;
  isVip?: boolean;
};

export type UserLevel = {
  level: number;
  xp: number;
  xpForNextLevel: number;
  progress: number;
};

export type Transaction = {
  id: string;
  type: 'Depósito' | 'Saque' | 'Aposta' | 'Prêmio' | 'Bônus' | 'Loja';
  description: string;
  amount: number;
  date: string;
  status: 'Concluído' | 'Pendente' | 'Cancelado';
};

export type Wallet = {
    id: string;
    userId: string;
    balance: number;
    transactions: Transaction[];
};

export type StoreItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ComponentType<{ className?: string }>;
};

export type StandingTeam = {
  id: number;
  name: string;
  logo: string;
};

export type StandingStats = {
  played: number;
  win: number;
  draw: number;
  lose: number;
  goals: {
    for: number;
    against: number;
  };
};

export type StandingEntry = {
  rank: number;
  team: StandingTeam;
  points: number;
  goalsDiff: number;
  all: StandingStats;
  description?: string | null;
};

export type Standing = {
  _id: string | ObjectId;
  league: {
    id: number;
    name: string;
    logo: string;
  };
  standings: StandingEntry[][];
};

export type BotConfig = {
  _id: string | ObjectId;
  guildId: string;
  welcomeChannelId: string;
  logChannelId: string;
  bettingChannelId: string;
  winnersChannelId: string;
  adminRoleId: string;
  vipRoleIds: string[];
};

export type ApiSettings = {
    _id: string | ObjectId;
    apiFootballKey?: string;
    maintenanceMode?: boolean;
    welcomeBonus?: number;
};
