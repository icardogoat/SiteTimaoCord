
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
  type: 'Depósito' | 'Saque' | 'Aposta' | 'Prêmio' | 'Bônus' | 'Loja' | 'Ajuste';
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
  _id: string | ObjectId;
  name: string;
  description: string;
  price: number;
  type: 'ROLE' | 'XP_BOOST'; // More types can be added later
  roleId?: string; // Discord role ID if type is ROLE
  xpAmount?: number; // Amount of XP if type is XP_BOOST
  isActive: boolean;
  createdAt: Date | string;
};

export type UserInventoryItem = {
    _id: string | ObjectId;
    userId: string;
    itemId: string | ObjectId;
    itemName: string;
    itemType: StoreItem['type'];
    redemptionCode: string;
    isRedeemed: boolean;
    purchasedAt: Date | string;
    redeemedAt?: Date | string;
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
  guildInviteUrl: string;
  welcomeChannelId: string;
  logChannelId: string;
  bettingChannelId: string;
  winnersChannelId: string;
  bolaoChannelId: string;
  mvpChannelId: string;
  adminRoleId: string;
  vipRoleIds: string[];
};

export type ApiSettings = {
    _id: string | ObjectId;
    apiFootballKey?: string;
    maintenanceMode?: boolean;
    welcomeBonus?: number;
    siteUrl?: string;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  hidden?: boolean;
};

export type BolaoParticipant = {
  userId: string;
  name: string;
  avatar: string;
  guess: {
    home: number;
    away: number;
  };
  guessedAt: Date | string;
};

export type Bolao = {
  _id: string | ObjectId;
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  league: string;
  matchTime: string;
  entryFee: number;
  prizePool: number;
  status: 'Aberto' | 'Fechado' | 'Pago' | 'Cancelado';
  participants: BolaoParticipant[];
  winners?: { userId: string, prize: number }[];
  createdAt: Date | string;
  finalScore?: { home: number, away: number };
};

export type MvpPlayer = {
  id: number;
  name: string;
  photo: string;
};

export type MvpTeamLineup = {
  teamId: number;
  teamName: string;
  teamLogo: string;
  players: MvpPlayer[];
};

export type MvpVote = {
    userId: string;
    playerId: number;
    votedAt: Date | string;
};

export type MvpVoting = {
  _id: string | ObjectId;
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  league: string;
  status: 'Aberto' | 'Finalizado' | 'Cancelado';
  lineups: MvpTeamLineup[];
  votes: MvpVote[];
  mvpPlayerId?: number;
  createdAt: Date | string;
  finalizedAt?: Date | string;
};
