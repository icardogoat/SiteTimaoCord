'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
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
import { ChampionshipSidebarMenu } from '@/components/championship-sidebar-menu';
import { BetSlipProvider } from '@/context/bet-slip-context';
import { BetSlip } from '@/components/bet-slip';

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <BetSlipProvider>
            <SidebarProvider>
                <Sidebar>
                    <SidebarHeader>
                        <div className="flex items-center gap-2">
                            <Link href="/bet" className="flex items-center gap-2">
                                <FielBetLogo className="size-7 text-primary" />
                                <h2 className="text-lg font-semibold font-headline text-primary">FielBet</h2>
                            </Link>
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
                    {children}
                    <BetSlip />
                </SidebarInset>
            </SidebarProvider>
        </BetSlipProvider>
    )
}
