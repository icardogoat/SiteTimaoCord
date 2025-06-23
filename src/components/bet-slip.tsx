'use client';

import { useState, useMemo, useEffect } from 'react';
import { useBetSlip } from '@/context/bet-slip-context';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BetSlipItem } from './bet-slip-item';
import { Ticket } from 'lucide-react';

export function BetSlip() {
  const { bets, clearBets } = useBetSlip();
  const [stake, setStake] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const totalOdds = useMemo(() => {
    if (bets.length === 0) return 0;
    return bets.reduce((acc, bet) => acc * parseFloat(bet.odd.value), 1);
  }, [bets]);

  const potentialWinnings = useMemo(() => {
    const stakeValue = parseFloat(stake);
    if (isNaN(stakeValue) || stakeValue <= 0) return '0.00';
    return (stakeValue * totalOdds).toFixed(2);
  }, [stake, totalOdds]);

  if (!isClient || bets.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed bottom-0 right-0 z-20 w-full max-w-sm p-4 hidden md:block">
      <Card className="flex flex-col max-h-[calc(100vh-2rem)]">
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="size-5" />
            <CardTitle className="text-lg">Boletim de Apostas</CardTitle>
          </div>
          {bets.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearBets} className="text-xs">
              Limpar
            </Button>
          )}
        </CardHeader>
        <ScrollArea className="flex-grow">
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {bets.map(bet => (
                <BetSlipItem key={bet.id} bet={bet} />
              ))}
            </div>
          </CardContent>
        </ScrollArea>
        {bets.length > 0 && (
          <CardFooter className="flex-col items-stretch gap-4 border-t p-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Total Odds</span>
              <span>{totalOdds.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stake">Valor da Aposta (R$)</Label>
              <Input
                id="stake"
                type="number"
                placeholder="0.00"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Ganhos Potenciais</span>
              <span>R$ {potentialWinnings}</span>
            </div>
            <Button size="lg" disabled={!stake || parseFloat(stake) <= 0}>
              Apostar
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
