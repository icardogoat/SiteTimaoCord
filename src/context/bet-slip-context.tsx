'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import type { Bet, Match, Market, Odd } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface BetSlipContextType {
  bets: Bet[];
  toggleBet: (match: Match, market: Market, odd: Odd) => void;
  removeBet: (betId: string) => void;
  clearBets: () => void;
  isBetSelected: (betId: string) => boolean;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [bets, setBets] = useState<Bet[]>([]);
  const { toast } = useToast();

  const toggleBet = useCallback((match: Match, market: Market, odd: Odd) => {
    const betId = `${match.id}-${market.name}-${odd.label}`;
    const existingBet = bets.find(b => b.id === betId);

    if (existingBet) {
      setBets(prevBets => prevBets.filter(b => b.id !== betId));
      return;
    }

    const newBet: Bet = {
      id: betId,
      matchId: match.id,
      matchTime: match.time,
      teamA: match.teamA.name,
      teamB: match.teamB.name,
      marketName: market.name,
      odd: odd,
    };

    if (bets.length === 0) {
      setBets([newBet]);
      return;
    }

    const isSlipInMultipleMode = bets.every(b => b.marketName === 'Vencedor da Partida');
    
    if (isSlipInMultipleMode) {
      if (newBet.marketName === 'Vencedor da Partida') {
        setBets(prevBets => [...prevBets, newBet]);
        return;
      }
      
      const firstMatchId = bets[0].matchId;
      const areAllBetsFromSameMatch = bets.every(b => b.matchId === firstMatchId);
      
      if (areAllBetsFromSameMatch && newBet.matchId === firstMatchId) {
          setBets(prevBets => {
            const marketIdPrefix = `${match.id}-${market.name}-`;
            const filteredBets = prevBets.filter(b => !b.id.startsWith(marketIdPrefix));
            return [...filteredBets, newBet];
          });
      } else {
        toast({
          title: 'Aposta Múltipla Inválida',
          description: 'Você só pode combinar "Vencedor da Partida" de jogos diferentes. Para outros mercados, todas as apostas devem ser do mesmo jogo.',
          variant: 'destructive'
        });
      }
    } else {
      const firstMatchId = bets[0].matchId;
      if (newBet.matchId === firstMatchId) {
          setBets(prevBets => {
            const marketIdPrefix = `${match.id}-${market.name}-`;
            const filteredBets = prevBets.filter(b => !b.id.startsWith(marketIdPrefix));
            return [...filteredBets, newBet];
          });
      } else {
        toast({
          title: 'Aposta Múltipla Inválida',
          description: 'Você só pode adicionar apostas da mesma partida no boletim.',
          variant: 'destructive'
        });
      }
    }
  }, [bets, toast]);

  const removeBet = useCallback((betId: string) => {
    setBets(prevBets => prevBets.filter(b => b.id !== betId));
  }, []);

  const clearBets = useCallback(() => {
    setBets([]);
  }, []);

  const isBetSelected = useCallback((betId: string) => {
    return bets.some(b => b.id === betId);
  }, [bets]);

  return (
    <BetSlipContext.Provider value={{ bets, toggleBet, removeBet, clearBets, isBetSelected }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (context === undefined) {
    throw new Error('useBetSlip must be used within a BetSlipProvider');
  }
  return context;
}
