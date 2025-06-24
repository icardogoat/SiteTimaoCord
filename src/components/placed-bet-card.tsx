'use client';

import { useState } from "react";
import type { PlacedBet } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PlacedBetCardProps {
    bet: PlacedBet;
}

export function PlacedBetCard({ bet }: PlacedBetCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const statusVariant = {
        'Ganha': 'default',
        'Perdida': 'destructive',
        'Em Aberto': 'secondary',
        'Cancelada': 'secondary'
    } as const;

    const getStatusClass = (status: PlacedBet['status']) => {
        switch (status) {
            case 'Ganha':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'Perdida':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return '';
        }
    };

    const isSingleBet = bet.bets.length === 1;
    const single = isSingleBet ? bet.bets[0] : null;

    const selectionsToShow = isExpanded ? bet.bets : bet.bets.slice(0, 2);
    const hasMoreSelections = bet.bets.length > 2;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base">
                            {isSingleBet ? `${single!.teamA} vs ${single!.teamB}` : `Aposta Múltipla (${bet.bets.length} seleções)`}
                        </CardTitle>
                        <CardDescription>
                            {isSingleBet ? `${single!.league} - ${single!.matchTime}` : `Realizada em: ${new Date(bet.createdAt).toLocaleString('pt-BR')}`}
                        </CardDescription>
                    </div>
                    <Badge variant={statusVariant[bet.status]} className={cn(bet.status !== 'Perdida' && getStatusClass(bet.status))}>
                        {bet.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
                {isSingleBet ? (
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">{single!.marketName}</p>
                        <p className="text-base font-bold text-foreground">{single!.selection}</p>
                    </div>
                ) : (
                    <div className="space-y-2 text-sm">
                        {selectionsToShow.map((selection, index) => (
                            <div key={index} className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{selection.selection}</span> em {selection.teamA} vs {selection.teamB}
                            </div>
                        ))}
                        {hasMoreSelections && (
                             <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setIsExpanded(!isExpanded)}>
                                {isExpanded ? 'Ver menos' : `Ver mais ${bet.bets.length - 2} seleções`}
                                {isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
            <Separator />
            <CardFooter className="grid grid-cols-3 gap-2 pt-4 text-center text-sm">
                 <div>
                    <p className="text-xs text-muted-foreground">Cotação</p>
                    <p className="font-bold text-foreground">{bet.totalOdds.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Aposta</p>
                    <p className="font-bold text-foreground">R$ {bet.stake.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Retorno Pot.</p>
                    <p className={cn("font-bold", {
                        'text-green-400': bet.status === 'Ganha',
                        'text-red-400': bet.status === 'Perdida',
                        'text-foreground': bet.status === 'Em Aberto',
                    })}>
                      R$ {bet.status === 'Perdida' ? '0.00' : bet.potentialWinnings.toFixed(2)}
                    </p>
                </div>
            </CardFooter>
        </Card>
    );
}
