'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import type { Match, Odd } from '@/types';
import { MoreMarketsDialog } from './more-markets-dialog';
import { useBetSlip } from '@/context/bet-slip-context';
import { cn } from '@/lib/utils';

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const mainMarket = match.markets.find(m => m.name === 'Vencedor da Partida' || m.name === 'Match Winner');
  const { toggleBet, isBetSelected } = useBetSlip();
  const isCorinthiansMatch = match.teamA.name === 'Corinthians' || match.teamB.name === 'Corinthians';

  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    // This effect runs only on the client
    const checkTime = () => {
      const now = new Date().getTime();
      const matchStartTime = match.timestamp * 1000;

      if (now >= matchStartTime) {
        setIsClosed(true);
        return null; // No timer needed if it's already past
      } else {
        setIsClosed(false);
        // Set a timer to close betting exactly when the match starts
        const timeUntilMatch = matchStartTime - now;
        const timer = setTimeout(() => {
          setIsClosed(true);
        }, timeUntilMatch);
        return timer;
      }
    };

    const timerId = checkTime();

    // Cleanup the timer when the component unmounts
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [match.timestamp]);

  const getOddByLabel = (label: string, alternativeLabel: string): Odd | undefined => {
    return mainMarket?.odds.find(o => o.label === label || o.label === alternativeLabel);
  }

  const homeOdd = getOddByLabel('Casa', 'Home');
  const drawOdd = getOddByLabel('Empate', 'Draw');
  const awayOdd = getOddByLabel('Fora', 'Away');

  const handleBetClick = (odd: Odd | undefined) => {
    if (!mainMarket || !odd) return;
    toggleBet(match, mainMarket, odd);
  };
  
  const showScore = match.status !== 'NS' && match.goals.home !== null && match.goals.away !== null;
  const isLive = !match.isFinished && match.status !== 'NS';

  const isBettingDisabled = isClosed || match.status !== 'NS';

  return (
    <Card className={cn("flex flex-col", isCorinthiansMatch && "border-primary/50 shadow-lg shadow-primary/10")}>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{match.league}</CardTitle>
        <Badge variant={isClosed || isLive ? 'destructive' : 'outline'}>
          {isBettingDisabled ? 'Encerrado' : (match.isFinished ? 'Finalizado' : isLive ? 'Ao Vivo' : match.time)}
        </Badge>
      </CardHeader>
      <CardContent className="flex-grow pt-4">
        <div className="flex items-center justify-around text-center">
          <div className="flex flex-col items-center gap-2 w-1/3">
            <Image
              src={match.teamA.logo}
              alt={`${match.teamA.name} logo`}
              width={48}
              height={48}
              className="rounded-full"
              data-ai-hint="team logo"
            />
            <span className="font-semibold truncate w-full">{match.teamA.name}</span>
          </div>

          {showScore ? (
            <div className="text-2xl font-bold text-foreground">
              <span>{match.goals.home}</span>
              <span className="mx-2">-</span>
              <span>{match.goals.away}</span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-muted-foreground">vs</span>
          )}

          <div className="flex flex-col items-center gap-2 w-1/3">
            <Image
              src={match.teamB.logo}
              alt={`${match.teamB.name} logo`}
              width={48}
              height={48}
              className="rounded-full"
              data-ai-hint="team logo"
            />
            <span className="font-semibold truncate w-full">{match.teamB.name}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {homeOdd && mainMarket && (
            <Button
              variant={isBetSelected(`${match.id}-${mainMarket.name}-${homeOdd.label}`) ? "default" : "secondary"}
              className="flex flex-col h-auto py-2"
              onClick={() => handleBetClick(homeOdd)}
              disabled={isBettingDisabled}
            >
              <span className="text-xs text-muted-foreground">1</span>
              <span className="font-bold">{homeOdd.value}</span>
            </Button>
          )}
          {drawOdd && mainMarket && (
            <Button
              variant={isBetSelected(`${match.id}-${mainMarket.name}-${drawOdd.label}`) ? "default" : "secondary"}
              className="flex flex-col h-auto py-2"
              onClick={() => handleBetClick(drawOdd)}
              disabled={isBettingDisabled}
            >
              <span className="text-xs text-muted-foreground">X</span>
              <span className="font-bold">{drawOdd.value}</span>
            </Button>
          )}
          {awayOdd && mainMarket &&(
            <Button
              variant={isBetSelected(`${match.id}-${mainMarket.name}-${awayOdd.label}`) ? "default" : "secondary"}
              className="flex flex-col h-auto py-2"
              onClick={() => handleBetClick(awayOdd)}
              disabled={isBettingDisabled}
            >
              <span className="text-xs text-muted-foreground">2</span>
              <span className="font-bold">{awayOdd.value}</span>
            </Button>
          )}
        </div>
        <MoreMarketsDialog match={match} isBettingDisabled={isBettingDisabled}>
          <Button variant="ghost" size="sm" disabled={isBettingDisabled}>
            Mais Mercados
          </Button>
        </MoreMarketsDialog>
      </CardFooter>
    </Card>
  );
}
