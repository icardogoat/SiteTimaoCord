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
