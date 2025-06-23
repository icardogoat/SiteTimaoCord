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
    
    setBets(prevBets => {
      const existingBetIndex = prevBets.findIndex(b => b.id === betId);
      
      if (existingBetIndex > -1) {
        return prevBets.filter(b => b.id !== betId);
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

      if (prevBets.length === 0) {
        return [newBet];
      }

      const isSlipInMultipleMode = prevBets.every(b => b.marketName === 'Vencedor da Partida');
      
      if (isSlipInMultipleMode) {
        if (newBet.marketName === 'Vencedor da Partida') {
          return [...prevBets, newBet];
        }
        
        const firstMatchId = prevBets[0].matchId;
        const areAllBetsFromSameMatch = prevBets.every(b => b.matchId === firstMatchId);
        
        if (areAllBetsFromSameMatch && newBet.matchId === firstMatchId) {
            const marketIdPrefix = `${match.id}-${market.name}-`;
            const filteredBets = prevBets.filter(b => !b.id.startsWith(marketIdPrefix));
            return [...filteredBets, newBet];
        } else {
          toast({
            title: 'Aposta Múltipla Inválida',
            description: 'Você só pode combinar "Vencedor da Partida" de jogos diferentes. Para outros mercados, todas as apostas devem ser do mesmo jogo.',
            variant: 'destructive'
          });
          return prevBets;
        }
      } else {
        const firstMatchId = prevBets[0].matchId;
        if (newBet.matchId === firstMatchId) {
            const marketIdPrefix = `${match.id}-${market.name}-`;
            const filteredBets = prevBets.filter(b => !b.id.startsWith(marketIdPrefix));
            return [...filteredBets, newBet];
        } else {
          toast({
            title: 'Aposta Múltipla Inválida',
            description: 'Você só pode adicionar apostas da mesma partida no boletim.',
            variant: 'destructive'
          });
          return prevBets;
        }
      }
    });
  }, [toast]);

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
