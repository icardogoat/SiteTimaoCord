'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import type { Match } from '@/types';
import { ScrollArea } from './ui/scroll-area';
import { useBetSlip } from '@/context/bet-slip-context';

interface MoreMarketsDialogProps {
  match: Match;
  children: React.ReactNode;
}

export function MoreMarketsDialog({ match, children }: MoreMarketsDialogProps) {
  const { toggleBet, isBetSelected } = useBetSlip();
  const defaultValues = match.markets.map(m => m.name);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mais Mercados</DialogTitle>
          <DialogDescription>
            {match.teamA.name} vs {match.teamB.name} - {match.league}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6">
          <Accordion type="multiple" defaultValue={defaultValues} className="w-full">
            {match.markets.map((market) => (
              <AccordionItem value={market.name} key={market.name}>
                <AccordionTrigger>{market.name}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {market.odds.map((odd) => (
                      <Button
                        variant={isBetSelected(`${match.id}-${market.name}-${odd.label}`) ? 'default' : 'secondary'}
                        className="flex flex-col h-auto py-2"
                        key={odd.label}
                        onClick={() => toggleBet(match, market, odd)}
                      >
                        <span className="text-xs text-muted-foreground">{odd.label}</span>
                        <span className="font-bold">{odd.value}</span>
                      </Button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
