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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, PlusCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";


// Mock data, in a real app this would come from a database
const matchesData = [
    { id: 1, teamA: "Corinthians", teamB: "Palmeiras", league: "Brasileirão Série A", time: "2025-07-20T21:00:00", status: "Agendada" },
    { id: 2, teamA: "Flamengo", teamB: "Vasco", league: "Campeonato Carioca", time: "2025-07-21T16:00:00", status: "Ao Vivo" },
    { id: 3, teamA: "Real Madrid", teamB: "Barcelona", league: "La Liga", time: "2025-07-22T17:00:00", status: "Finalizada" },
    { id: 4, teamA: "Man. City", teamB: "Liverpool", league: "Premier League", time: "2025-07-23T12:30:00", status: "Agendada" },
    { id: 5, teamA: "Bayern", teamB: "Dortmund", league: "Bundesliga", time: "2025-07-23T14:30:00", status: "Cancelada" },
];

const marketsConfig = [
    { name: "Vencedor da Partida", odds: ["Casa", "Empate", "Fora"] },
    { name: "Vencedor do 2º Tempo", odds: ["Casa", "Empate", "Fora"] },
    { name: "Gols Acima/Abaixo", odds: ["Acima 0.5", "Abaixo 0.5", "Acima 1.5", "Abaixo 1.5", "Acima 2.5", "Abaixo 2.5", "Acima 3.5", "Abaixo 3.5"] },
    { name: "Gols Acima/Abaixo (1º Tempo)", odds: ["Acima 0.5", "Abaixo 0.5", "Acima 1.5", "Abaixo 1.5"] },
    { name: "Gols Acima/Abaixo (2º Tempo)", odds: ["Acima 0.5", "Abaixo 0.5", "Acima 1.5", "Abaixo 1.5"] },
    { name: "Dupla Chance HT/FT", odds: ["Casa/Empate", "Casa/Fora", "Empate/Casa", "Empate/Fora", "Fora/Casa", "Fora/Empate"] },
    { name: "Ambos Marcam (BTTS)", odds: ["Sim", "Não"] },
    { name: "Handicap de Resultado", odds: ["Casa -1", "Empate -1", "Fora +1", "Casa +1", "Fora -1"] },
    { name: "Placar Exato", odds: ["1-0", "2-1", "0-0", "1-1", "0-1", "1-2"] },
    { name: "Placar Exato (1º Tempo)", odds: ["1-0", "0-0", "0-1", "1-1"] },
    { name: "Vencedor do 1º Tempo", odds: ["Casa", "Empate", "Fora"] },
    { name: "Total de Gols da Casa", odds: ["Acima 0.5", "Abaixo 0.5", "Acima 1.5", "Abaixo 1.5"] },
    { name: "Total de Gols do Visitante", odds: ["Acima 0.5", "Abaixo 0.5", "Acima 1.5", "Abaixo 1.5"] },
    { name: "Dupla Chance (1º Tempo)", odds: ["Casa ou Empate", "Fora ou Empate", "Casa ou Fora"] },
    { name: "Dupla Chance (2º Tempo)", odds: ["Casa ou Empate", "Fora ou Empate", "Casa ou Fora"] },
    { name: "Ímpar/Par", odds: ["Ímpar", "Par"] },
    { name: "Escanteios 1x2", odds: ["Casa", "Empate", "Fora"] },
    { name: "Escanteios Acima/Abaixo", odds: ["Acima 8.5", "Abaixo 8.5", "Acima 10.5", "Abaixo 10.5"] },
    { name: "Total de Gols da Casa (1º Tempo)", odds: ["Acima 0.5", "Abaixo 0.5"] },
    { name: "Total de Gols do Visitante (1º Tempo)", odds: ["Acima 0.5", "Abaixo 0.5"] },
    { name: "Aposta sem Empate (1º Tempo)", odds: ["Casa", "Fora"] },
    { name: "Aposta sem Empate (2º Tempo)", odds: ["Casa", "Fora"] },
    { name: "Escanteios da Casa Acima/Abaixo", odds: ["Acima 4.5", "Abaixo 4.5"] },
    { name: "Escanteios do Visitante Acima/Abaixo", odds: ["Acima 3.5", "Abaixo 3.5"] },
    { name: "Total de Escanteios (1º Tempo)", odds: ["Acima 4.5", "Abaixo 4.5"] },
    { name: "Cartões Acima/Abaixo", odds: ["Acima 3.5", "Abaixo 3.5", "Acima 4.5", "Abaixo 4.5"] },
];

const initialMatchState = {
    teamA: "",
    teamB: "",
    league: "",
    time: "",
    markets: {}
};

type Match = typeof matchesData[0];

export default function AdminMatchesPage() {
    const [matches, setMatches] = useState(matchesData);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [matchData, setMatchData] = useState(initialMatchState);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setMatchData(prev => ({ ...prev, [id]: value }));
    };

    const handleOddsChange = (marketName: string, oddLabel: string, value: string) => {
        setMatchData(prev => ({
            ...prev,
            markets: {
                ...prev.markets,
                [marketName]: {
                    ...(prev.markets as any)[marketName],
                    [oddLabel]: value
                }
            }
        }));
    };

    const openCreateDialog = () => {
        setEditingMatch(null);
        setMatchData(initialMatchState);
        setIsDialogOpen(true);
    };

    const openEditDialog = (match: Match) => {
        setEditingMatch(match);
        setMatchData({
            teamA: match.teamA,
            teamB: match.teamB,
            league: match.league,
            time: match.time.substring(0, 16), // Format for datetime-local
            markets: (match as any).markets || {} // Load existing odds if available
        });
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (editingMatch) {
            setMatches(prev => prev.map(match =>
                match.id === editingMatch.id
                    ? { ...editingMatch, ...matchData, time: new Date(matchData.time).toISOString() }
                    : match
            ));
        } else {
            const newId = matches.length > 0 ? Math.max(...matches.map(m => m.id)) + 1 : 1;
            const newMatch: Match = {
                id: newId,
                status: 'Agendada',
                ...matchData,
                time: new Date(matchData.time).toISOString()
            };
            setMatches(prev => [...prev, newMatch]);
        }
        setIsDialogOpen(false);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Gerenciar Partidas</CardTitle>
                    <CardDescription>
                        Adicione, edite ou remova partidas da plataforma.
                    </CardDescription>
                </div>
                 <Button size="sm" className="gap-1" onClick={openCreateDialog}>
                    <PlusCircle className="h-4 w-4" />
                    Criar Partida
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">ID da Partida</TableHead>
                            <TableHead>Partida</TableHead>
                            <TableHead>Liga</TableHead>
                            <TableHead>Horário</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead>
                                <span className="sr-only">Ações</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {matches.map((match) => (
                            <TableRow key={match.id}>
                                <TableCell className="font-mono text-xs">{match.id}</TableCell>
                                <TableCell className="font-medium">{match.teamA} vs {match.teamB}</TableCell>
                                <TableCell>{match.league}</TableCell>
                                <TableCell>{new Date(match.time).toLocaleString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={
                                        match.status === "Ao Vivo" ? "destructive" :
                                        match.status === "Finalizada" ? "outline" :
                                        match.status === "Cancelada" ? "secondary" :
                                        "default"
                                    } className={
                                        match.status === "Ao Vivo" ? "bg-red-500/80" : ""
                                    }>
                                        {match.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => openEditDialog(match)}>Editar</DropdownMenuItem>
                                            {match.status === "Agendada" && <DropdownMenuItem>Iniciar Partida</DropdownMenuItem>}
                                            {match.status === "Ao Vivo" && <DropdownMenuItem>Resolver Partida</DropdownMenuItem>}
                                            <DropdownMenuItem className="text-destructive">Cancelar Partida</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingMatch ? 'Editar Partida' : 'Criar Nova Partida'}</DialogTitle>
                        <DialogDescription>
                            {editingMatch 
                                ? 'Altere os detalhes da partida e as odds dos mercados.' 
                                : 'Preencha os detalhes da nova partida e as odds para os mercados.'}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-grow">
                        <div className="pr-4">
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="teamA" className="text-right">Time A</Label>
                                    <Input id="teamA" value={matchData.teamA} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="teamB" className="text-right">Time B</Label>
                                    <Input id="teamB" value={matchData.teamB} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="league" className="text-right">Liga</Label>
                                    <Input id="league" value={matchData.league} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="time" className="text-right">Data/Hora</Label>
                                    <Input id="time" type="datetime-local" value={matchData.time} onChange={handleInputChange} className="col-span-3" />
                                </div>
                            </div>
                            <Accordion type="multiple" className="w-full" defaultValue={marketsConfig.map(m => m.name)}>
                                {marketsConfig.map((market) => (
                                    <AccordionItem value={market.name} key={market.name}>
                                        <AccordionTrigger className="text-base hover:no-underline">{market.name}</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="p-4 bg-muted/50 rounded-md">
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    {market.odds.map((oddLabel) => (
                                                        <div className="grid gap-1.5" key={oddLabel}>
                                                            <Label htmlFor={`${market.name}-${oddLabel}`} className="text-xs text-muted-foreground">{oddLabel}</Label>
                                                            <Input 
                                                                id={`${market.name}-${oddLabel}`} 
                                                                type="number" 
                                                                step="0.01" 
                                                                placeholder="1.00"
                                                                className="h-9"
                                                                value={(matchData.markets as any)[market.name]?.[oddLabel] || ''}
                                                                onChange={(e) => handleOddsChange(market.name, oddLabel, e.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSave}>Salvar Partida</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
