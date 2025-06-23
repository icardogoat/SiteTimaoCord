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
