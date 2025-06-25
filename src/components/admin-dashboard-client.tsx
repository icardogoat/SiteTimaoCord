
'use client'

import { Activity, CreditCard, DollarSign, Users } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
import type { DashboardStats, TopBettor, RecentBet, WeeklyBetVolume } from "@/actions/admin-actions"
import { cn } from "@/lib/utils"

const chartConfig = {
  total: {
    label: "Total Apostado",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface AdminDashboardClientProps {
    stats: DashboardStats;
    weeklyVolume: WeeklyBetVolume;
    topBettors: TopBettor[];
    recentBets: RecentBet[];
}

export function AdminDashboardClient({ stats, weeklyVolume, topBettors, recentBets }: AdminDashboardClientProps) {
    const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getChangeColor = (value: number) => value >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:grid-cols-3">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:col-span-3">
          <Card>
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
          <Card>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Apostas</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.totalBets.toLocaleString('pt-BR')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getChangeColor(stats.grossProfit)}`}>
                  {stats.grossProfit >= 0 ? `+${formatCurrency(stats.grossProfit)}` : formatCurrency(stats.grossProfit)}
              </div>
            </CardContent>
          </Card>
      </div>

      <div className="grid gap-4 lg:col-span-3 lg:grid-cols-3">
          <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle>Volume de Apostas (Últimos 7 Dias)</CardTitle>
                  <CardDescription>Total apostado por dia na última semana.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-4 pt-0">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full min-w-[500px]">
                      <BarChart accessibilityLayer data={weeklyVolume}>
                          <CartesianGrid vertical={false} />
                          <XAxis
                              dataKey="date"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              tickFormatter={(value) => value.slice(0, 3)}
                          />
                          <YAxis
                              tickFormatter={(value) => `R$ ${Number(value) / 1000}k`}
                          />
                          <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent
                                  indicator="dot"
                                  hideIndicator
                                  formatter={(value, name, item) => (
                                      <div className="flex w-full items-center gap-2">
                                          <div
                                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                              style={{ backgroundColor: item.color }}
                                          />
                                          <div className="flex flex-1 justify-between">
                                              <span className="text-muted-foreground">Total Apostado</span>
                                              <span className="font-mono font-medium tabular-nums text-foreground">
                                                  {formatCurrency(Number(value))}
                                              </span>
                                          </div>
                                      </div>
                                  )}
                              />}
                          />
                          <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                      </BarChart>
                  </ChartContainer>
              </CardContent>
          </Card>
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
                        {user.email}
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
                                {bet.userEmail}
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
