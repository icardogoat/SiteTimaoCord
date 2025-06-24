'use client';

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Loader2 } from "lucide-react"
import { resolveMatch } from "@/actions/admin-actions";
import { useToast } from "@/hooks/use-toast";

type MatchAdminView = {
    id: string;
    fixtureId: number;
    teamA: string;
    teamB: string;
    league: string;
    time: string;
    status: string;
};

interface AdminMatchesClientProps {
    initialMatches: MatchAdminView[];
}


export function AdminMatchesClient({ initialMatches }: AdminMatchesClientProps) {
    const [matches, setMatches] = useState(initialMatches);
    const [isResolving, setIsResolving] = useState<number | null>(null);
    const { toast } = useToast();

    const handleResolve = async (fixtureId: number) => {
        setIsResolving(fixtureId);
        const result = await resolveMatch(fixtureId);
        if (result.success) {
            toast({
                title: "Sucesso!",
                description: result.message,
            });
            // Update match status locally for immediate feedback
            setMatches(prev => prev.map(m => 
                m.fixtureId === fixtureId ? { ...m, status: 'Finalizada' } : m
            ));
        } else {
            toast({
                title: "Erro ao Resolver",
                description: result.message,
                variant: "destructive",
            });
        }
        setIsResolving(null);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Partidas</CardTitle>
                <CardDescription>
                    Resolva as partidas finalizadas para pagar as apostas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Partida</TableHead>
                            <TableHead className="hidden md:table-cell">Liga</TableHead>
                            <TableHead className="hidden lg:table-cell">Horário</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead>
                                <span className="sr-only">Ações</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {matches.map((match) => (
                            <TableRow key={match.id}>
                                <TableCell className="font-medium">{match.teamA} vs {match.teamB}</TableCell>
                                <TableCell className="hidden md:table-cell">{match.league}</TableCell>
                                <TableCell className="hidden lg:table-cell">{match.time}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={
                                        match.status === "Ao Vivo" ? "destructive" :
                                        match.status === "Finalizada" ? "outline" :
                                        "secondary"
                                    } className={
                                        match.status === "Ao Vivo" ? "bg-red-500/80" : ""
                                    }>
                                        {match.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isResolving === match.fixtureId}>
                                                {isResolving === match.fixtureId ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <MoreHorizontal className="h-4 w-4" />
                                                )}
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem 
                                                onClick={() => handleResolve(match.fixtureId)}
                                                disabled={match.status !== 'Ao Vivo' && match.status !== 'Agendada' }
                                            >
                                                Resolver Partida
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
