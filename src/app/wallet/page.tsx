import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

const transactions: Transaction[] = [
  { id: '1', type: 'Prêmio', description: 'Aposta ganha: Real Madrid vs Barcelona', amount: 85.00, date: '24/05/2025', status: 'Concluído' },
  { id: '2', type: 'Aposta', description: 'Aposta: Manchester City vs Liverpool', amount: -15.00, date: '25/05/2025', status: 'Concluído' },
  { id: '3', type: 'Aposta', description: 'Aposta: Flamengo vs Vasco', amount: -20.00, date: '23/05/2025', status: 'Concluído' },
  { id: '4', type: 'Depósito', description: 'Depósito via Pix', amount: 100.00, date: '22/05/2025', status: 'Concluído' },
  { id: '5', type: 'Saque', description: 'Saque para conta bancária', amount: -50.00, date: '20/05/2025', status: 'Pendente' },
  { id: '6', type: 'Aposta', description: 'Aposta: Corinthians vs Palmeiras', amount: -10.00, date: '21/05/2025', status: 'Concluído' },
];

const getStatusClass = (status: Transaction['status']) => {
    switch (status) {
        case 'Concluído':
            return 'text-green-400';
        case 'Pendente':
            return 'text-yellow-400';
        case 'Cancelado':
            return 'text-red-400';
    }
};

const getAmountClass = (amount: number) => {
    return amount > 0 ? 'text-green-400' : 'text-red-400';
}

export default function WalletPage() {
    const currentBalance = 1234.56;

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
                            <CardFooter className="flex gap-2">
                                <Button className="w-full">
                                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                                    Depositar
                                </Button>
                                <Button variant="secondary" className="w-full">
                                     <ArrowDownCircle className="mr-2 h-4 w-4" />
                                    Sacar
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <div className="md:col-span-2">
                         <Card>
                            <CardHeader>
                                <CardTitle>Histórico de Transações</CardTitle>
                                <CardDescription>Suas últimas movimentações financeiras.</CardDescription>
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
                                        {transactions.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell>
                                                    <p className="font-medium">{t.type}</p>
                                                    <p className="text-sm text-muted-foreground">{t.description}</p>
                                                </TableCell>
                                                <TableCell className="text-center">{t.date}</TableCell>
                                                <TableCell className={cn("text-center font-medium", getStatusClass(t.status))}>{t.status}</TableCell>
                                                <TableCell className={cn("text-right font-bold", getAmountClass(t.amount))}>
                                                    {t.amount > 0 ? '+' : ''} R$ {Math.abs(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
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
