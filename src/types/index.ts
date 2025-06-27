
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
  type: 'ROLE' | 'XP_BOOST' | 'AD_REMOVAL';
  duration?: 'PERMANENT' | 'MONTHLY';
  durationInDays?: number;
  roleId?: string;
  xpAmount?: number;
  isActive: boolean;
  createdAt: Date | string;
};

export type UserInventoryItem = {
    _id: string | ObjectId;
    userId: string;
    itemId: string | ObjectId;
    itemName: string;
    pricePaid: number;
    itemType: StoreItem['type'];
    itemDuration?: StoreItem['duration'];
    redemptionCode: string;
    isRedeemed: boolean;
    purchasedAt: Date | string;
    redeemedAt?: Date | string;
    expiresAt?: Date | string;
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

export type ApiKeyEntry = {
  id: string;
  key: string;
  usage: number;
  lastReset: Date | string;
};

export type ApiSettings = {
    _id: string | ObjectId;
    apiKeys?: ApiKeyEntry[];
    siteUrl?: string;
    adNetworkScript?: string;
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
  mvpPlayerIds?: number[];
  createdAt: Date | string;
  endsAt?: Date | string;
  finalizedAt?: Date | string;
};

export type Advertisement = {
  _id: string | ObjectId;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  status: 'active' | 'inactive' | 'pending';
  owner: 'system' | 'user';
  userId?: string;
  createdAt: Date | string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

export type PurchaseAdminView = {
  id: string; // inventory item id
  userName: string;
  userAvatar: string;
  itemName: string;
  itemType: StoreItem['type'];
  pricePaid: number;
  isRedeemed: boolean;
  purchasedAt: string;
  redemptionCode?: string;
  userId: string;
};

export type PlayerStat = {
    id: number;
    name: string;
    photo: string;
    position: string;
    appearences: number;
    goals: number;
    assists: number | null;
};

export type TimaoData = {
    upcomingMatches: Match[];
    recentMatches: Match[];
    stats: {
        totalMatches: number;
        wins: number;
        draws: number;
        losses: number;
    };
    topPlayers: PlayerStat[];
};

export type PlayerStatsData = {
    _id: ObjectId | string;
    teamId: number;
    season: number;
    players: PlayerStat[];
    lastUpdated: Date;
}
