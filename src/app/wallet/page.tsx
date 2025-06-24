
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { redirect } from 'next/navigation';

const getStatusClass = (status: Transaction['status']) => {
    switch (status) {
        case 'Concluído':
            return 'text-green-400';
        case 'Pendente':
            return 'text-yellow-400';
        case 'Cancelado':
            return 'text-red-400';
        default:
            return '';
    }
};

const getAmountClass = (amount: number) => {
    return amount > 0 ? 'text-green-400' : 'text-red-400';
}

export default async function WalletPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/');
    }

    let currentBalance = 0;
    let transactions: Transaction[] = [];

    try {
        const client = await clientPromise;
        const db = client.db("timaocord");
        const walletData = await db.collection("wallets").findOne({ userId: session.user.discordId });

        if (walletData) {
            currentBalance = walletData.balance;
            transactions = walletData.transactions.sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
    } catch (error) {
        console.error("Failed to fetch wallet data:", error);
    }
    
    return (
        <AppLayout>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Minha Carteira</h1>
                    <p className="text-muted-foreground">Gerencie seu saldo e veja seu histórico de transações.</p>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    <div className="md:col-span-1 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Saldo Atual</CardTitle>
                                <CardDescription>Seu saldo disponível para apostas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold">R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-2">
                         <Card>
                            <CardHeader>
                                <CardTitle>Histórico de Transações</CardTitle>
                                <CardDescription>Seu histórico de ganhos e perdas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead className="text-center">Data</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.length > 0 ? transactions.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell>
                                                    <p className="font-medium">{t.type}</p>
                                                    <p className="text-sm text-muted-foreground">{t.description}</p>
                                                </TableCell>
                                                <TableCell className="text-center">{new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                                                <TableCell className={cn("text-center font-medium", getStatusClass(t.status))}>{t.status}</TableCell>
                                                <TableCell className={cn("text-right font-bold", getAmountClass(t.amount))}>
                                                    {t.amount > 0 ? '+' : ''} R$ {Math.abs(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma transação encontrada.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
