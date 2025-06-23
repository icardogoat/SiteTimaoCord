'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { FielBetLogo } from '@/components/icons';
import { Header } from '@/components/header';
import { MatchCard } from '@/components/match-card';
import { ChampionshipSidebarMenu } from '@/components/championship-sidebar-menu';
import type { Match } from '@/types';
import { BetSlipProvider } from '@/context/bet-slip-context';
import { BetSlip } from '@/components/bet-slip';

interface BetPageClientProps {
    matches: Match[];
}

export function BetPageClient({ matches }: BetPageClientProps) {
    return (
        <BetSlipProvider>
            <SidebarProvider>
                <Sidebar>
                    <SidebarHeader>
                        <div className="flex items-center gap-2">
                            <FielBetLogo className="size-7 text-primary" />
                            <h2 className="text-lg font-semibold font-headline text-primary">FielBet</h2>
                            <div className="grow" />
                            <SidebarTrigger />
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarGroupLabel>Campeonatos</SidebarGroupLabel>
                            <SidebarGroupContent>
                            <SidebarMenu>
                                <ChampionshipSidebarMenu />
                            </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>
                <SidebarInset>
                    <Header />
                    <main className="p-4 sm:p-6 lg:p-8 pb-32 md:pb-8 md:pr-[26rem]">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold font-headline tracking-tight">Próximas Partidas</h1>
                            <p className="text-muted-foreground">Os jogos mais quentes para você apostar.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {matches.map((match) => (
                            <MatchCard key={match.id} match={match} />
                            ))}
                        </div>
                    </main>
                    <BetSlip />
                </SidebarInset>
            </SidebarProvider>
        </BetSlipProvider>
    )
}
