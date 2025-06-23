import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';

type Team = {
  name: string;
  logo: string;
};

type Match = {
  teamA: Team;
  teamB: Team;
  time: string;
  league: string;
  odds: {
    home: string;
    draw: string;
    away: string;
  };
};

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{match.league}</CardTitle>
        <Badge variant="outline">{match.time}</Badge>
      </CardHeader>
      <CardContent className="flex-grow pt-4">
        <div className="flex items-center justify-around text-center">
          <div className="flex flex-col items-center gap-2">
            <Image
              src={match.teamA.logo}
              alt={`${match.teamA.name} logo`}
              width={48}
              height={48}
              className="rounded-full"
              data-ai-hint="team logo"
            />
            <span className="font-semibold">{match.teamA.name}</span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">vs</span>
          <div className="flex flex-col items-center gap-2">
            <Image
              src={match.teamB.logo}
              alt={`${match.teamB.name} logo`}
              width={48}
              height={48}
              className="rounded-full"
              data-ai-hint="team logo"
            />
            <span className="font-semibold">{match.teamB.name}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" className="flex flex-col h-auto py-2">
            <span className="text-xs text-muted-foreground">1</span>
            <span className="font-bold">{match.odds.home}</span>
          </Button>
          <Button variant="secondary" className="flex flex-col h-auto py-2">
            <span className="text-xs text-muted-foreground">X</span>
            <span className="font-bold">{match.odds.draw}</span>
          </Button>
          <Button variant="secondary" className="flex flex-col h-auto py-2">
            <span className="text-xs text-muted-foreground">2</span>
            <span className="font-bold">{match.odds.away}</span>
          </Button>
        </div>
        <Button variant="ghost" size="sm">
          Mais Mercados
        </Button>
      </CardFooter>
    </Card>
  );
}
