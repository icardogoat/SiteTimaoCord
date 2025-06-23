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

// Mock data, in a real app this would come from a database
const users = [
    { id: "user1", name: "Zico da Fiel", email: "zico.fiel@example.com", joinDate: "2025-01-15", totalBets: 58, totalWagered: 1250.75, balance: 5421.50, status: "Ativo", avatar: "https://placehold.co/40x40.png" },
    { id: "user2", name: "Craque Neto 10", email: "neto10@example.com", joinDate: "2025-02-20", totalBets: 112, totalWagered: 3450.00, balance: 12876.00, status: "Ativo", avatar: "https://placehold.co/40x40.png" },
    { id: "user3", name: "Vampeta Monstro", email: "vamp@example.com", joinDate: "2025-03-01", totalBets: 75, totalWagered: 2100.50, balance: 9876.50, status: "Suspenso", avatar: "https://placehold.co/40x40.png" },
    { id: "user4", name: "Ronaldo Fenômeno", email: "r9@example.com", joinDate: "2025-04-10", totalBets: 45, totalWagered: 890.00, balance: 7321.75, status: "Ativo", avatar: "https://placehold.co/40x40.png" },
    { id: "user5", name: "Cássio Gigante", email: "cassio12@example.com", joinDate: "2025-05-05", totalBets: 91, totalWagered: 5500.20, balance: 6987.20, status: "Ativo", avatar: "https://placehold.co/40x40.png" },
    { id: "user6", name: "Marcelinho Carioca", email: "pe.de.anjo@example.com", joinDate: "2025-06-18", totalBets: 32, totalWagered: 650.00, balance: 11050.25, status: "Ativo", avatar: "https://placehold.co/40x40.png" },
];

type User = (typeof users)[0];


export default function AdminUsersPage() {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
                                <TableHead className="text-right">Saldo</TableHead>
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
                                    <TableCell className="text-right font-medium">R$ {user.balance.toFixed(2)}</TableCell>
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
                    {selectedUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Nome
                                </Label>
                                <Input id="name" defaultValue={selectedUser.name} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input id="email" type="email" defaultValue={selectedUser.email} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">
                                    Status
                                </Label>
                                <Select defaultValue={selectedUser.status}>
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
                                <Input id="balance" defaultValue={`R$ ${selectedUser.balance.toFixed(2)}`} className="col-span-3" readOnly />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="wagered" className="text-right">
                                    Total Apostado
                                </Label>
                                <Input id="wagered" defaultValue={`R$ ${selectedUser.totalWagered.toFixed(2)}`} className="col-span-3" readOnly />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSelectedUser(null)}>Cancelar</Button>
                        <Button type="submit" onClick={() => setSelectedUser(null)}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
