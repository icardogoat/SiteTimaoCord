import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { getAvailableLeagues } from "@/actions/bet-actions";
import { getRankings } from "@/actions/user-actions";

export default async function RankingPage() {
  const [availableLeagues, rankings] = await Promise.all([
      getAvailableLeagues(),
      getRankings()
  ]);

  return (
    <AppLayout availableLeagues={availableLeagues}>
      <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-headline tracking-tight">Ranking de Ganhadores</h1>
          <p className="text-muted-foreground">Veja quem são os maiores vencedores da FielBet.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Trophy className="text-yellow-400" />
                Top 10 Apostadores
            </CardTitle>
            <CardDescription>O ranking dos maiores campeões em ganhos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-right">Ganhos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.length > 0 ? (
                    rankings.map((user) => (
                      <TableRow key={user.rank}>
                        <TableCell className="text-center font-bold text-lg">
                            {user.rank <= 3 ? (
                                <span className={
                                    user.rank === 1 ? "text-yellow-400" :
                                    user.rank === 2 ? "text-gray-400" :
                                    "text-orange-400"
                                }>
                                    {user.rank}
                                </span>
                            ) : user.rank}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-400">
                          R$ {user.winnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                          Ainda não há apostadores no ranking.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
