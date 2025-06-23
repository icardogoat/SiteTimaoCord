
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
import { MoreHorizontal, PlusCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Mock data, in a real app this would come from a database
const users = [
    { id: "user1", name: "Zico da Fiel", email: "zico.fiel@example.com", joinDate: "2025-01-15", totalBets: 58, totalWagered: 1250.75, status: "Ativo", avatar: "https://placehold.co/40x40.png" },
    { id: "user2", name: "Craque Neto 10", email: "neto10@example.com", joinDate: "2025-02-20", totalBets: 112, totalWagered: 3450.00, status: "Ativo", avatar: "https://placehold.co/40x40.png" },
    { id: "user3", name: "Vampeta Monstro", email: "vamp@example.com", joinDate: "2025-03-01", totalBets: 75, totalWagered: 2100.50, status: "Suspenso", avatar: "https://placehold.co/40x40.png" },
    { id: "user4", name: "Ronaldo Fenômeno", email: "r9@example.com", joinDate: "2025-04-10", totalBets: 45, totalWagered: 890.00, status: "Ativo", avatar: "https://placehold.co/40x40.png" },
    { id: "user5", name: "Cássio Gigante", email: "cassio12@example.com", joinDate: "2025-05-05", totalBets: 91, totalWagered: 5500.20, status: "Ativo", avatar: "https://placehold.co/40x40.png" },
    { id: "user6", name: "Marcelinho Carioca", email: "pe.de.anjo@example.com", joinDate: "2025-06-18", totalBets: 32, totalWagered: 650.00, status: "Ativo", avatar: "https://placehold.co/40x40.png" },
];


export default function AdminUsersPage() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                    <CardTitle>Usuários</CardTitle>
                    <CardDescription>
                        Gerencie os usuários da plataforma.
                    </CardDescription>
                </div>
                <Button size="sm" className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    Adicionar Usuário
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Data de Cadastro</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Total Apostado</TableHead>
                            <TableHead>
                                <span className="sr-only">Ações</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="user avatar"/>
                                            <AvatarFallback>{user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{new Date(user.joinDate).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={user.status === "Ativo" ? "outline" : "destructive"}>
                                        {user.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">R$ {user.totalWagered.toFixed(2)}</TableCell>
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
                                            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                                            {user.status === "Ativo" && <DropdownMenuItem className="text-destructive">Suspender Usuário</DropdownMenuItem>}
                                            {user.status === "Suspenso" && <DropdownMenuItem>Reativar Usuário</DropdownMenuItem>}
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
