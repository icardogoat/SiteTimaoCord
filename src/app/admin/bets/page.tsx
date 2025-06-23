
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
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
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { Label } from "@/components/ui/label";

// Mock data, in a real app this would come from a database
const allBets = [
    { id: 1001, user: { name: "Zico da Fiel", email: "zico.fiel@example.com" }, match: "Corinthians vs Palmeiras", selection: "Casa @ 2.50", stake: 250.00, potentialWinnings: 625.00, status: "Em Aberto" },
    { id: 1002, user: { name: "Craque Neto 10", email: "neto10@example.com" }, match: "Flamengo vs Vasco", selection: "Sim @ 1.85", market: "Ambos Marcam", stake: 150.00, potentialWinnings: 277.50, status: "Ganha" },
    { id: 1003, user: { name: "Vampeta Monstro", email: "vamp@example.com" }, match: "Real Madrid vs Barcelona", selection: "Fora @ 3.30", stake: 350.00, potentialWinnings: 1155.00, status: "Perdida" },
    { id: 1004, user: { name: "Ronaldo Fenômeno", email: "r9@example.com" }, match: "Man. City vs Liverpool", selection: "Acima 2.5 @ 1.70", market: "Gols", stake: 450.00, potentialWinnings: 765.00, status: "Ganha" },
    { id: 1005, user: { name: "Cássio Gigante", email: "cassio12@example.com" }, match: "Bayern vs Dortmund", selection: "Casa -1.5 @ 2.20", market: "Handicap", stake: 550.00, potentialWinnings: 1210.00, status: "Em Aberto" },
    { id: 1006, user: { name: "Marcelinho Carioca", email: "pe.de.anjo@example.com" }, match: "PSG vs Marseille", selection: "Empate @ 5.00", stake: 100.00, potentialWinnings: 500.00, status: "Perdida" },
];

type Bet = typeof allBets[0];

export default function AdminBetsPage() {
    const [selectedBet, setSelectedBet] = useState<Bet | null>(null);

    const openBets = allBets.filter(b => b.status === 'Em Aberto');
    const wonBets = allBets.filter(b => b.status === 'Ganha');
    const lostBets = allBets.filter(b => b.status === 'Perdida');

    const renderTable = (bets: typeof allBets) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">ID da Aposta</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Partida</TableHead>
                    <TableHead>Seleção</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ganhos Potenciais</TableHead>
                    <TableHead>
                        <span className="sr-only">Ações</span>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {bets.map((bet) => (
                    <TableRow key={bet.id}>
                        <TableCell className="font-mono text-xs">{bet.id}</TableCell>
                        <TableCell>
                            <div className="font-medium">{bet.user.name}</div>
                            <div className="text-sm text-muted-foreground">{bet.user.email}</div>
                        </TableCell>
                        <TableCell>{bet.match}</TableCell>
                        <TableCell>
                            <div>{bet.selection}</div>
                            {bet.market && <div className="text-xs text-muted-foreground">{bet.market}</div>}
                        </TableCell>
                        <TableCell className="text-right">R$ {bet.stake.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={
                                bet.status === "Ganha" ? "outline" : bet.status === "Perdida" ? "destructive" : "secondary"
                            }>
                                {bet.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">R$ {bet.potentialWinnings.toFixed(2)}</TableCell>
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
                                  <DropdownMenuItem onClick={() => setSelectedBet(bet)}>Ver Detalhes</DropdownMenuItem>
                                  {bet.status === "Em Aberto" && <DropdownMenuItem>Resolver Aposta</DropdownMenuItem>}
                                  <DropdownMenuItem className="text-destructive">Cancelar Aposta</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

  return (
    <>
        <Tabs defaultValue="all">
            <div className="flex items-center">
                <TabsList>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="open">Em Aberto</TabsTrigger>
                    <TabsTrigger value="won">Ganha</TabsTrigger>
                    <TabsTrigger value="lost">Perdida</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="all">
                <Card>
                    <CardHeader>
                        <CardTitle>Todas as Apostas</CardTitle>
                        <CardDescription>
                            Gerencie todas as apostas realizadas na plataforma.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderTable(allBets)}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="open">
                <Card>
                    <CardHeader>
                        <CardTitle>Apostas em Aberto</CardTitle>
                        <CardDescription>
                            Apostas que ainda não foram resolvidas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderTable(openBets)}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="won">
                <Card>
                    <CardHeader>
                        <CardTitle>Apostas Ganhas</CardTitle>
                        <CardDescription>
                            Histórico de apostas vitoriosas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderTable(wonBets)}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="lost">
                <Card>
                    <CardHeader>
                        <CardTitle>Apostas Perdidas</CardTitle>
                        <CardDescription>
                            Histórico de apostas perdidas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderTable(lostBets)}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        <Dialog open={!!selectedBet} onOpenChange={(isOpen) => !isOpen && setSelectedBet(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Detalhes da Aposta</DialogTitle>
                    <DialogDescription>
                        Informações detalhadas sobre a aposta selecionada.
                    </DialogDescription>
                </DialogHeader>
                {selectedBet && (
                    <div className="grid gap-4 py-4 text-sm">
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">ID da Aposta</Label>
                            <p className="font-mono text-xs">{selectedBet.id}</p>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Usuário</Label>
                            <div className="text-right">
                                <p className="font-medium">{selectedBet.user.name}</p>
                                <p className="text-muted-foreground">{selectedBet.user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Partida</Label>
                            <p className="font-medium text-right">{selectedBet.match}</p>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Seleção</Label>
                            <div className="text-right">
                                <p className="font-medium">{selectedBet.selection}</p>
                                {selectedBet.market && <p className="text-muted-foreground">{selectedBet.market}</p>}
                            </div>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Valor da Aposta</Label>
                            <p className="font-medium">R$ {selectedBet.stake.toFixed(2)}</p>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Ganhos Potenciais</Label>
                            <p className="font-medium">R$ {selectedBet.potentialWinnings.toFixed(2)}</p>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Status</Label>
                             <Badge variant={
                                selectedBet.status === "Ganha" ? "outline" : selectedBet.status === "Perdida" ? "destructive" : "secondary"
                            }>
                                {selectedBet.status}
                            </Badge>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedBet(null)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  )
}
