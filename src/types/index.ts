
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
};

// This is the bet selection that goes into the bet slip
export type BetInSlip = {
  id: string; // A unique identifier for the bet, e.g., `${match.id}-${market.name}-${odd.label}`
  matchId: number;
  matchTime: string;
  teamA: string;
  teamB: string;
  league: string;
  marketName: string;
  odd: Odd;
};

// This is the structure of a bet placed and saved in the DB
export type PlacedBet = {
  _id: string | ObjectId; // string on client, ObjectId on server
  userId: string;
  bets: { // The individual selections in the bet slip
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
  avatar: string;
  name: string;
  winnings: number;
};

export type Transaction = {
  id: string;
  type: 'Depósito' | 'Saque' | 'Aposta' | 'Prêmio' | 'Bônus';
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

    