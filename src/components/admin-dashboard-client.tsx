
'use client'

import { Activity, CreditCard, DollarSign, Users, Loader2, RefreshCw, BellRing, Send } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { useState } from "react"
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DashboardStats, TopBettor, RecentBet, BetVolumeData, ProfitLossData } from "@/actions/admin-actions"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { processAllFinishedMatches, sendAnnouncement, getChartData } from "@/actions/admin-actions";
import { sendUpcomingMatchNotifications } from "@/actions/match-notifications";
import { Separator } from "./ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";


const volumeChartConfig = {
  totalWagered: {
    label: "Total Apostado",
    color: "hsl(var(--chart-1))",
  },
  totalBets: {
    label: "Nº de Apostas",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const profitChartConfig = {
    wagered: {
        label: "Apostado",
        color: "hsl(var(--chart-4))",
    },
    winnings: {
        label: "Ganhos (Prêmios)",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig

const announcementSchema = z.object({
    title: z.string().min(5, "Título muito curto.").max(50, "Título muito longo."),
    description: z.string().min(10, "Descrição muito curta.").max(200, "Descrição muito longa."),
    target: z.enum(['all', 'vip', 'normal']),
    link: z.string().url("URL inválida.").optional().or(z.literal('')),
});

interface AdminDashboardClientProps {
    stats: DashboardStats;
    initialChartData: { volume: BetVolumeData; profit: ProfitLossData; };
    topBettors: TopBettor[];
    recentBets: RecentBet[];
}

const obfuscateEmail = (email: string) => {
    if (!email || !email.includes('@')) {
        return 'Email inválido';
    }
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 3) {
        return `${localPart.slice(0, 1)}*****@${domain}`;
    }
    return `${localPart.slice(0, 3)}*****@${domain}`;
};


export function AdminDashboardClient({ stats, initialChartData, topBettors, recentBets }: AdminDashboardClientProps) {
    const { toast } = useToast();
    const [isProcessingAll, setIsProcessingAll] = useState(false);
    const [isNotifying, setIsNotifying] = useState(false);
    const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
    const [chartData, setChartData] = useState(initialChartData);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly'>('weekly');
    
    const announcementForm = useForm<z.infer<typeof announcementSchema>>({
        resolver: zodResolver(announcementSchema),
        defaultValues: {
            title: '',
            description: '',
            target: 'all',
            link: '',
        },
    });
    
    const handleProcessAll = async () => {
        setIsProcessingAll(true);
        toast({ title: "Iniciando Processamento", description: "Buscando e processando todas as partidas finalizadas..." });
        const result = await processAllFinishedMatches();
        toast({ title: "Processamento Concluído", description: result.message, variant: result.success ? "default" : "destructive" });
        setIsProcessingAll(false);
    };

    const handleNotifyUpcoming = async () => {
        setIsNotifying(true);
        toast({ title: "Verificando Partidas", description: "Buscando partidas prestes a começar para notificar..." });
        const result = await sendUpcomingMatchNotifications();
        toast({ title: "Verificação Concluída", description: result.message, variant: result.success ? "default" : "destructive" });
        setIsNotifying(false);
    };

    const onAnnouncementSubmit = async (values: z.infer<typeof announcementSchema>) => {
        setIsSendingAnnouncement(true);
        const result = await sendAnnouncement(values);
        if (result.success) {
            toast({ title: `Sucesso!`, description: result.message });
            announcementForm.reset();
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsSendingAnnouncement(false);
    };
    
    const handlePeriodChange = async (period: 'weekly' | 'monthly') => {
        setIsChartLoading(true);
        setChartPeriod(period);
        const newData = await getChartData(period);
        setChartData(newData);
        setIsChartLoading(false);
    }
    
    const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getChangeColor = (value: number) => value >= 0 ? "text-green-500" : "text-red-500";

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:grid-cols-3">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:col-span-3">
          <Card className="border-l-4 border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Apostado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalWagered)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-sky-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Usuários Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.activeUsers}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Apostas</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.totalBets.toLocaleString('pt-BR')}</div>
            </CardContent>
          </Card>
          <Card className={cn("border-l-4", stats.grossProfit >= 0 ? "border-green-500" : "border-red-500")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getChangeColor(stats.grossProfit))}>
                  {stats.grossProfit >= 0 ? `+${formatCurrency(stats.grossProfit)}` : formatCurrency(stats.grossProfit)}
              </div>
            </CardContent>
          </Card>
      </div>

        <Card className="lg:col-span-3">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Visão Geral de Desempenho</CardTitle>
                        <CardDescription>Análise de volume de apostas e lucratividade.</CardDescription>
                    </div>
                    <Tabs defaultValue="weekly" onValueChange={(value) => handlePeriodChange(value as any)} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="weekly">Semanal</TabsTrigger>
                            <TabsTrigger value="monthly">Mensal</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent className="relative pt-2">
                {isChartLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-lg">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
                <div className={cn("grid grid-cols-1 xl:grid-cols-2 gap-8", isChartLoading && "opacity-50 blur-sm")}>
                    <div>
                        <h3 className="font-semibold mb-4 text-center">Volume de Apostas ({chartPeriod === 'weekly' ? 'Últimos 7 dias' : 'Este Mês'})</h3>
                        <ChartContainer config={volumeChartConfig} className="h-[350px] w-full min-w-[300px]">
                            <BarChart data={chartData.volume}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
                                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="totalWagered" fill="var(--color-totalWagered)" radius={4} name="Total Apostado" />
                                <Bar yAxisId="right" dataKey="totalBets" fill="var(--color-totalBets)" radius={4} name="Nº de Apostas" />
                            </BarChart>
                        </ChartContainer>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-4 text-center">Lucratividade ({chartPeriod === 'weekly' ? 'Últimos 7 dias' : 'Este Mês'})</h3>
                        <ChartContainer config={profitChartConfig} className="h-[350px] w-full min-w-[300px]">
                            <BarChart data={chartData.profit}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis tickFormatter={(value) => `R$${Number(value)/1000}k`} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar dataKey="wagered" fill="var(--color-wagered)" radius={4} name="Apostado" />
                                <Bar dataKey="winnings" fill="var(--color-winnings)" radius={4} name="Ganhos (Prêmios)" />
                            </BarChart>
                        </ChartContainer>
                    </div>
                </div>
            </CardContent>
        </Card>

      <div className="grid gap-4 md:gap-8 lg:col-span-2">
         <Card>
              <CardHeader>
                <CardTitle>Top Apostadores</CardTitle>
                <CardDescription>
                  Usuários com maior volume de apostas.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-8">
                {topBettors.map(user => (
                    <div className="flex items-center gap-4" key={user.email}>
                      <Avatar className={cn("hidden h-9 w-9 sm:flex", user.isVip && "ring-2 ring-vip")}>
                        <AvatarImage src={user.avatar} alt="Avatar" data-ai-hint="user avatar" />
                        <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none">
                          {user.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {obfuscateEmail(user.email)}
                        </p>
                      </div>
                      <div className="ml-auto font-medium">{formatCurrency(user.totalWagered)}</div>
                    </div>
                ))}
                {topBettors.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground">Nenhum apostador encontrado.</p>
                )}
              </CardContent>
            </Card>
      </div>

      <div className="grid auto-rows-max gap-4 md:gap-8 lg:col-span-1">
          <Card>
            <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <CardDescription>Execute tarefas manuais e envie comunicados.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleProcessAll} disabled={isProcessingAll || isNotifying} className="flex-1">
                        {isProcessingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Processar Partidas
                    </Button>
                    <Button onClick={handleNotifyUpcoming} disabled={isProcessingAll || isNotifying} variant="outline" className="flex-1">
                        {isNotifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                        Notificar Próximas
                    </Button>
                </div>
                <Separator />
                <Form {...announcementForm}>
                    <form onSubmit={announcementForm.handleSubmit(onAnnouncementSubmit)} className="space-y-4">
                        <p className="text-sm font-medium">Enviar Comunicado Global</p>
                        <FormField control={announcementForm.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel className="sr-only">Título</FormLabel><FormControl><Input placeholder="Título do comunicado" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={announcementForm.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel className="sr-only">Descrição</FormLabel><FormControl><Textarea placeholder="Descrição do comunicado..." {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                            <FormField control={announcementForm.control} name="link" render={({ field }) => (
                            <FormItem><FormLabel className="sr-only">Link</FormLabel><FormControl><Input placeholder="Link opcional (ex: /store)" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <FormField control={announcementForm.control} name="target" render={({ field }) => (
                                <FormItem className="flex-1">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Público Alvo" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Usuários</SelectItem>
                                            <SelectItem value="vip">Apenas VIPs</SelectItem>
                                            <SelectItem value="normal">Não-VIPs</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}/>
                            <Button type="submit" disabled={isSendingAnnouncement} className="flex-1">
                                {isSendingAnnouncement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Enviar
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card>
            <CardHeader className="flex flex-row items-center">
              <div className="grid gap-2">
                <CardTitle>Apostas Recentes</CardTitle>
                <CardDescription>
                  As últimas 5 apostas realizadas na plataforma.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Aposta
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Status
                    </TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {recentBets.map((bet, index) => (
                        <TableRow key={index}>
                            <TableCell>
                            <div className="font-medium">{bet.userName}</div>
                            <div className="hidden text-sm text-muted-foreground md:inline">
                                {obfuscateEmail(bet.userEmail)}
                            </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                                {bet.matchDescription}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                                <Badge className="text-xs" variant={
                                    bet.status === "Ganha" ? "outline" : bet.status === "Perdida" ? "destructive" : "secondary"
                                }>
                                    {bet.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(bet.stake)}</TableCell>
                        </TableRow>
                    ))}
                    {recentBets.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma aposta recente.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}
