import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserRanking } from "@/types";
import { Trophy } from "lucide-react";
import { getAvailableLeagues } from "@/actions/bet-actions";

const rankings: UserRanking[] = [
  { rank: 1, avatar: "https://placehold.co/40x40.png", name: "Zico da Fiel", winnings: 15230.50 },
  { rank: 2, avatar: "https://placehold.co/40x40.png", name: "Craque Neto 10", winnings: 12876.00 },
  { rank: 3, avatar: "https://placehold.co/40x40.png", name: "Marcelinho Carioca", winnings: 11050.25 },
  { rank: 4, avatar: "https://placehold.co/40x40.png", name: "Vampeta Monstro", winnings: 9876.50 },
  { rank: 5, avatar: "https://placehold.co/40x40.png", name: "Doutor Sócrates", winnings: 8543.00 },
  { rank: 6, avatar: "https://placehold.co/40x40.png", name: "Ronaldo Fenômeno", winnings: 7321.75 },
  { rank: 7, avatar: "https://placehold.co/40x40.png", name: "Cássio Gigante", winnings: 6987.20 },
  { rank: 8, avatar: "https://placehold.co/40x40.png", name: "Rivelino Reizinho", winnings: 5432.10 },
  { rank: 9, avatar: "https://placehold.co/40x40.png", name: "Biro-Biro Timao", winnings: 4999.99 },
  { rank: 10, avatar: "https://placehold.co/40x40.png", name: "Paulinho Guerreiro", winnings: 4500.00 },
];

export default async function RankingPage() {
  const availableLeagues = await getAvailableLeagues();

  return (
    <AppLayout availableLeagues={availableLeagues}>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
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
                {rankings.map((user) => (
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
                          <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="user avatar" />
                          <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-400">
                      R$ {user.winnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
