
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trophy } from "lucide-react";
import Link from 'next/link';
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getAvailableLeagues } from "@/actions/bet-actions";
import { getUserStats, getRankings } from "@/actions/user-actions";
import { redirect } from "next/navigation";
import { Progress } from "@/components/ui/progress";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/');
  }

  const [
    userStats,
    rankings,
    availableLeagues
  ] = await Promise.all([
    getUserStats(session.user.discordId),
    getRankings(),
    getAvailableLeagues()
  ]);

  const { totalWinnings, totalLosses } = userStats;
  
  const user = session.user;
  const userName = user.name ?? "Usuário";
  const userEmail = user.email ?? "email@example.com";
  const userImage = user.image;
  const userFallback = userName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const userRankData = rankings.find(rankedUser => rankedUser.name === userName);

  const userLevel = user.level ?? { level: 1, xp: 0, xpForNextLevel: 100, progress: 0 };
  const { level, progress, xp, xpForNextLevel } = userLevel;

  return (
    <AppLayout availableLeagues={availableLeagues}>
      <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
              <h1 className="text-3xl font-bold font-headline tracking-tight">Perfil</h1>
              <p className="text-muted-foreground">Veja suas informações de perfil e estatísticas.</p>
          </div>
          <div className="mx-auto max-w-2xl space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                    <CardDescription>Suas informações de perfil não podem ser alteradas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={userImage ?? undefined} alt="User Avatar" />
                            <AvatarFallback>{userFallback}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input id="name" defaultValue={userName} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={userEmail} readOnly disabled />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Nível de Experiência</CardTitle>
                    <CardDescription>Seu progresso baseado no total apostado (XP).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-baseline">
                        <p className="text-sm text-muted-foreground">Nível Atual</p>
                        <p className="text-3xl font-bold">{level}</p>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
                             <p>
                                {xp.toLocaleString('pt-BR')} / {xpForNextLevel.toLocaleString('pt-BR')} XP
                            </p>
                            <p>
                                Nível {level + 1}
                            </p>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sua Posição no Ranking</CardTitle>
                    <CardDescription>Sua colocação entre os maiores ganhadores.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Trophy className="h-10 w-10 text-yellow-400" />
                        <div>
                            <p className="text-sm text-muted-foreground">Posição Atual</p>
                            <p className="text-3xl font-bold">{userRankData ? `#${userRankData.rank}` : 'N/A'}</p>
                        </div>
                    </div>
                    <Link href="/ranking" className={cn(buttonVariants({ variant: "outline" }))}>
                        Ver Ranking Completo
                    </Link>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Estatísticas de Apostas</CardTitle>
                    <CardDescription>Seu histórico de ganhos e perdas em todo o tempo.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-sm text-muted-foreground">Total Ganho</p>
                        <p className="text-2xl font-bold text-green-400">R$ {totalWinnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-sm text-muted-foreground">Total Perdido</p>
                        <p className="text-2xl font-bold text-red-400">R$ {totalLosses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </CardContent>
            </Card>
          </div>
      </div>
    </AppLayout>
  )
}
