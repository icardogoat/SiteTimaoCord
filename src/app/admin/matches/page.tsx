
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

// Mock data, in a real app this would come from a database
const matches = [
    { id: "match1", teamA: "Corinthians", teamB: "Palmeiras", league: "Brasileirão Série A", time: "2025-07-20T21:00:00", status: "Agendada" },
    { id: "match2", teamA: "Flamengo", teamB: "Vasco", league: "Campeonato Carioca", time: "2025-07-21T16:00:00", status: "Ao Vivo" },
    { id: "match3", teamA: "Real Madrid", teamB: "Barcelona", league: "La Liga", time: "2025-07-22T17:00:00", status: "Finalizada" },
    { id: "match4", teamA: "Man. City", teamB: "Liverpool", league: "Premier League", time: "2025-07-23T12:30:00", status: "Agendada" },
    { id: "match5", teamA: "Bayern", teamB: "Dortmund", league: "Bundesliga", time: "2025-07-23T14:30:00", status: "Cancelada" },
];

export default function AdminMatchesPage() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Gerenciar Partidas</CardTitle>
                    <CardDescription>
                        Adicione, edite ou remova partidas da plataforma.
                    </CardDescription>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                            <PlusCircle className="h-4 w-4" />
                            Criar Partida
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Criar Nova Partida</DialogTitle>
                            <DialogDescription>
                                Preencha os detalhes da nova partida.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="teamA" className="text-right">
                                    Time A
                                </Label>
                                <Input id="teamA" defaultValue="Corinthians" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="teamB" className="text-right">
                                    Time B
                                </Label>
                                <Input id="teamB" defaultValue="São Paulo" className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="league" className="text-right">
                                    Liga
                                </Label>
                                <Input id="league" defaultValue="Brasileirão Série A" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="time" className="text-right">
                                    Data/Hora
                                </Label>
                                <Input id="time" type="datetime-local" className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Salvar Partida</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
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
                                <TableCell className="font-medium">{match.teamA} vs {match.teamB}</TableCell>
                                <TableCell>{match.league}</TableCell>
                                <TableCell>{new Date(match.time).toLocaleString('pt-BR')}</TableCell>
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
                                            <DropdownMenuItem>Editar</DropdownMenuItem>
                                            <DropdownMenuItem>Adicionar Mercados</DropdownMenuItem>
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
        </Card>
    )
}
