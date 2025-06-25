
'use server';

import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Zap, Wallet } from "lucide-react";
import { getAvailableLeagues } from "@/actions/bet-actions";
import { getTopWinners, getMostActiveBettors, getTopLevelUsers, getRichestUsers } from "@/actions/user-actions";
import { cn } from "@/lib/utils";
import type { UserRanking, ActiveBettorRanking, TopLevelUserRanking, RichestUserRanking } from "@/types";


const RankBadge = ({ rank }: { rank: number }) => {
    if (rank <= 3) {
        return (
            <span className={cn(
                "font-bold text-lg",
                rank === 1 && "text-yellow-400",
                rank === 2 && "text-gray-400",
                rank === 3 && "text-orange-400"
            )}>
                {rank}
            </span>
        );
    }
    return <>{rank}</>;
};

const WinnersTable = ({ data }: { data: UserRanking[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Ganhos</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map((user) => (
                <TableRow key={user.rank}>
                    <TableCell className="text-center"><RankBadge rank={user.rank} /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                                <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-400">
                        R$ {user.winnings.toFixed(2)}
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Ainda não há apostadores no ranking.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);

const RichestTable = ({ data }: { data: RichestUserRanking[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map((user) => (
                <TableRow key={user.rank}>
                    <TableCell className="text-center"><RankBadge rank={user.rank} /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                                <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                        R$ {user.balance.toFixed(2)}
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Ainda não há apostadores no ranking.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);

const MostActiveTable = ({ data }: { data: ActiveBettorRanking[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Apostas Feitas</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map((user) => (
                <TableRow key={user.rank}>
                    <TableCell className="text-center"><RankBadge rank={user.rank} /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                                <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                        {user.totalBets}
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Ninguém fez apostas ainda.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);


const TopLevelsTable = ({ data }: { data: TopLevelUserRanking[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Nível</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map((user) => (
                <TableRow key={user.rank}>
                    <TableCell className="text-center"><RankBadge rank={user.rank} /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                                <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <span className="font-semibold">{user.level}</span>
                        <span className="text-xs text-muted-foreground ml-2">({user.xp} XP)</span>
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Ninguém subiu de nível ainda.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);

export default async function RankingPage() {
  const [
    availableLeagues,
    topWinners,
    mostActiveBettors,
    topLevelUsers,
    richestUsers,
  ] = await Promise.all([
      getAvailableLeagues(),
      getTopWinners(),
      getMostActiveBettors(),
      getTopLevelUsers(),
      getRichestUsers(),
  ]);

  return (
    <AppLayout availableLeagues={availableLeagues}>
      <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-headline tracking-tight">Rankings</h1>
          <p className="text-muted-foreground">Veja quem são os melhores da FielBet em várias categorias.</p>
        </div>

        <Tabs defaultValue="winners" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4">
                <TabsTrigger value="winners">
                    <Trophy className="mr-2 h-4 w-4" /> Maiores Ganhadores
                </TabsTrigger>
                <TabsTrigger value="richest">
                    <Wallet className="mr-2 h-4 w-4" /> Mais Ricos
                </TabsTrigger>
                <TabsTrigger value="most_active">
                    <Medal className="mr-2 h-4 w-4" /> Mais Ativos
                </TabsTrigger>
                <TabsTrigger value="top_levels">
                    <Zap className="mr-2 h-4 w-4" /> Top Níveis
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="winners">
                <Card>
                    <CardHeader>
                        <CardTitle>Top 10 Ganhadores</CardTitle>
                        <CardDescription>O ranking dos maiores campeões em ganhos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <WinnersTable data={topWinners} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="richest">
                <Card>
                    <CardHeader>
                        <CardTitle>Top 10 Mais Ricos</CardTitle>
                        <CardDescription>Usuários com o maior saldo na carteira.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RichestTable data={richestUsers} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="most_active">
                <Card>
                    <CardHeader>
                        <CardTitle>Top 10 Mais Ativos</CardTitle>
                        <CardDescription>Usuários que fizeram o maior número de apostas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MostActiveTable data={mostActiveBettors} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="top_levels">
                 <Card>
                    <CardHeader>
                        <CardTitle>Top 10 Níveis de XP</CardTitle>
                        <CardDescription>Os usuários com mais experiência na plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TopLevelsTable data={topLevelUsers} />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
