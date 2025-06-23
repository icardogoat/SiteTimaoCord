
'use client';

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type User = {
    id: string;
    name: string;
    email: string;
    discordId: number;
    joinDate: string;
    totalBets: number;
    totalWagered: number;
    balance: number;
    status: "Ativo" | "Suspenso";
    avatar: string;
    rank: number;
};

// Mock data, in a real app this would come from a database
const initialUsers: User[] = [
    { id: "user1", name: "Zico da Fiel", email: "zico.fiel@example.com", discordId: 282862304804438017, joinDate: "2025-01-15", totalBets: 58, totalWagered: 1250.75, balance: 5421.50, status: "Ativo", avatar: "https://placehold.co/40x40.png", rank: 2 },
    { id: "user2", name: "Craque Neto 10", email: "neto10@example.com", discordId: 292962304804438018, joinDate: "2025-02-20", totalBets: 112, totalWagered: 3450.00, balance: 12876.00, status: "Ativo", avatar: "https://placehold.co/40x40.png", rank: 3 },
    { id: "user3", name: "Vampeta Monstro", email: "vamp@example.com", discordId: 303062304804438019, joinDate: "2025-03-01", totalBets: 75, totalWagered: 2100.50, balance: 9876.50, status: "Suspenso", avatar: "https://placehold.co/40x40.png", rank: 5 },
    { id: "user4", name: "Ronaldo Fenômeno", email: "r9@example.com", discordId: 313162304804438020, joinDate: "2025-04-10", totalBets: 45, totalWagered: 890.00, balance: 7321.75, status: "Ativo", avatar: "https://placehold.co/40x40.png", rank: 4 },
    { id: "user5", name: "Cássio Gigante", email: "cassio12@example.com", discordId: 323262304804438021, joinDate: "2025-05-05", totalBets: 91, totalWagered: 5500.20, balance: 6987.20, status: "Ativo", avatar: "https://placehold.co/40x40.png", rank: 1 },
    { id: "user6", name: "Marcelinho Carioca", email: "pe.de.anjo@example.com", discordId: 333362304804438022, joinDate: "2025-06-18", totalBets: 32, totalWagered: 650.00, balance: 11050.25, status: "Ativo", avatar: "https://placehold.co/40x40.png", rank: 6 },
];


export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editedUser, setEditedUser] = useState<User | null>(null);
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
    const [newUserDiscordId, setNewUserDiscordId] = useState("");

    useEffect(() => {
        if (selectedUser) {
            setEditedUser({ ...selectedUser });
        } else {
            setEditedUser(null);
        }
    }, [selectedUser]);

    const handleEditUser = () => {
        if (!editedUser) return;
        setUsers(users.map(u => u.id === editedUser.id ? editedUser : u));
        setSelectedUser(null);
    };

    const handleAddUser = () => {
        const discordIdNumber = parseInt(newUserDiscordId, 10);
        if (!newUserDiscordId || isNaN(discordIdNumber)) return;

        const newUser: User = {
            id: `user${users.length + 1}`,
            name: `Usuário ${discordIdNumber}`,
            email: `user.${discordIdNumber}@discord.user`,
            discordId: discordIdNumber,
            joinDate: new Date().toISOString().split('T')[0],
            totalBets: 0,
            totalWagered: 0,
            balance: 0,
            status: "Ativo",
            avatar: "https://placehold.co/40x40.png",
            rank: users.length + 1
        };

        setUsers(prevUsers => [...prevUsers, newUser]);
        setIsAddUserDialogOpen(false);
        setNewUserDiscordId("");
    };

    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.discordId.toString().includes(searchTerm) ||
        user.rank.toString().includes(searchTerm)
    );

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                     <div>
                        <CardTitle>Usuários</CardTitle>
                        <CardDescription>
                            Gerencie os usuários da plataforma.
                        </CardDescription>
                    </div>
                    <Button size="sm" className="gap-1" onClick={() => setIsAddUserDialogOpen(true)}>
                        <PlusCircle className="h-4 w-4" />
                        Adicionar Usuário
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="py-4">
                        <Input
                            placeholder="Pesquisar por rank, nome, email ou ID do Discord..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:max-w-sm"
                        />
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16 text-center">Rank</TableHead>
                                <TableHead>Usuário</TableHead>
                                <TableHead className="hidden md:table-cell">Data de Cadastro</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                                <TableHead className="hidden text-right md:table-cell">Total Apostado</TableHead>
                                <TableHead>
                                    <span className="sr-only">Ações</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="text-center font-medium">{user.rank}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="hidden h-9 w-9 sm:flex">
                                                <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="user avatar"/>
                                                <AvatarFallback>{user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="hidden text-sm text-muted-foreground sm:block">{user.email}</div>
                                                <div className="text-xs text-muted-foreground">Discord ID: {user.discordId}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{new Date(user.joinDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={user.status === "Ativo" ? "outline" : "destructive"}>
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">R$ {user.balance.toFixed(2)}</TableCell>
                                    <TableCell className="hidden text-right md:table-cell">R$ {user.totalWagered.toFixed(2)}</TableCell>
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
                                                <DropdownMenuItem onSelect={() => setSelectedUser(user)}>
                                                    Editar
                                                </DropdownMenuItem>
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

            <Dialog open={!!selectedUser} onOpenChange={(isOpen) => !isOpen && setSelectedUser(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                        <DialogDescription>
                            Altere as informações do usuário aqui. Clique em salvar para aplicar as mudanças.
                        </DialogDescription>
                    </DialogHeader>
                    {editedUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Nome
                                </Label>
                                <Input 
                                    id="name" 
                                    value={editedUser.name} 
                                    onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                                    className="col-span-3" 
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    value={editedUser.email} 
                                    onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                                    className="col-span-3" 
                                />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="discordId" className="text-right">
                                    Discord ID
                                </Label>
                                <Input 
                                    id="discordId"
                                    type="number"
                                    value={editedUser.discordId} 
                                    onChange={(e) => setEditedUser({...editedUser, discordId: parseInt(e.target.value) || 0})}
                                    className="col-span-3" 
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">
                                    Status
                                </Label>
                                <Select 
                                    value={editedUser.status}
                                    onValueChange={(value) => setEditedUser({...editedUser, status: value as 'Ativo' | 'Suspenso'})}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione um status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Ativo">Ativo</SelectItem>
                                        <SelectItem value="Suspenso">Suspenso</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="balance" className="text-right">
                                    Saldo
                                </Label>
                                <Input id="balance" value={`R$ ${editedUser.balance.toFixed(2)}`} className="col-span-3" readOnly />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="wagered" className="text-right">
                                    Total Apostado
                                </Label>
                                <Input id="wagered" value={`R$ ${editedUser.totalWagered.toFixed(2)}`} className="col-span-3" readOnly />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSelectedUser(null)}>Cancelar</Button>
                        <Button type="submit" onClick={handleEditUser}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                        <DialogDescription>
                            Insira a ID numérica do Discord do usuário para adicioná-lo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-discord-id" className="text-right">
                                Discord ID
                            </Label>
                            <Input id="new-discord-id" type="number" value={newUserDiscordId} onChange={(e) => setNewUserDiscordId(e.target.value)} placeholder="ID numérica do Discord" className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { setIsAddUserDialogOpen(false); setNewUserDiscordId(''); }}>Cancelar</Button>
                        <Button type="submit" onClick={handleAddUser}>Adicionar Usuário</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
