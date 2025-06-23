import type { PlacedBet } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";

interface PlacedBetCardProps {
    bet: PlacedBet;
}

export function PlacedBetCard({ bet }: PlacedBetCardProps) {
    const statusVariant = {
        'Ganha': 'default',
        'Perdida': 'destructive',
        'Em Aberto': 'secondary',
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

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base">{bet.teamA} vs {bet.teamB}</CardTitle>
                        <CardDescription>{bet.league} - {bet.matchTime}</CardDescription>
                    </div>
                    <Badge variant={statusVariant[bet.status]} className={cn(bet.status !== 'Perdida' && getStatusClass(bet.status))}>
                        {bet.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{bet.marketName}</p>
                    <p className="text-base font-bold text-foreground">{bet.selection}</p>
                </div>
                {bet.finalResult && (
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Resultado Final</p>
                        <p className="text-base font-bold text-foreground">{bet.finalResult}</p>
                    </div>
                )}
            </CardContent>
            <Separator />
            <CardFooter className="grid grid-cols-3 gap-2 pt-4 text-center text-sm">
                 <div>
                    <p className="text-xs text-muted-foreground">Cotação</p>
                    <p className="font-bold text-foreground">{bet.oddValue}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Aposta</p>
                    <p className="font-bold text-foreground">R$ {bet.stake.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Retorno</p>
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
