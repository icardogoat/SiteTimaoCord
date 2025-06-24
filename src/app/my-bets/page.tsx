import { AppLayout } from "@/components/app-layout";
import { PlacedBetCard } from "@/components/placed-bet-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PlacedBet } from "@/types";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';
import { redirect } from 'next/navigation';
import type { WithId } from "mongodb";

async function getMyBets(userId: string): Promise<PlacedBet[]> {
  if (!userId) {
    return [];
  }
  try {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const betsCollection = db.collection<WithId<PlacedBet>>('bets');

    const userBets = await betsCollection
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Map _id to id and convert to JSON-serializable format
    return userBets.map(bet => ({
        ...bet,
        _id: bet._id.toString(),
        createdAt: bet.createdAt.toISOString(),
        settledAt: bet.settledAt ? bet.settledAt.toISOString() : undefined,
    })) as PlacedBet[];

  } catch (error) {
    console.error('Failed to fetch user bets:', error);
    return [];
  }
}


export default async function MyBetsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        redirect('/');
    }

    const placedBets = await getMyBets(session.user.discordId);

    const openBets = placedBets.filter(bet => bet.status === 'Em Aberto');
    const settledBets = placedBets.filter(bet => bet.status !== 'Em Aberto');

    return (
        <AppLayout>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Minhas Apostas</h1>
                    <p className="text-muted-foreground">Acompanhe suas apostas abertas e resolvidas.</p>
                </div>

                <Tabs defaultValue="open">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="open">Em Aberto</TabsTrigger>
                        <TabsTrigger value="settled">Resolvidas</TabsTrigger>
                    </TabsList>
                    <TabsContent value="open">
                        <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
                            {openBets.length > 0 ? (
                                openBets.map(bet => <PlacedBetCard key={bet._id} bet={bet} />)
                            ) : (
                                <p className="text-muted-foreground col-span-full">Você não tem apostas em aberto.</p>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="settled">
                        <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
                            {settledBets.length > 0 ? (
                                settledBets.map(bet => <PlacedBetCard key={bet._id} bet={bet} />)
                            ) : (
                                <p className="text-muted-foreground col-span-full">Você não tem apostas resolvidas.</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </AppLayout>
    )
}
