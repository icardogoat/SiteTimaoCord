
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { FielBetLogo } from '@/components/icons';
import { Header } from '@/components/header';
import { ChampionshipSidebarMenu } from '@/components/championship-sidebar-menu';
import { BetSlipProvider } from '@/context/bet-slip-context';
import { BetSlip } from '@/components/bet-slip';
import { Store, ShieldCheck, Swords, Star, Megaphone } from 'lucide-react';
import { AdBanner } from './ad-banner';

interface AppLayoutProps {
    children: ReactNode;
    availableLeagues?: string[];
}

export function AppLayout({ children, availableLeagues }: AppLayoutProps) {
    const pathname = usePathname();

    return (
        <SidebarProvider>
            <BetSlipProvider>
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
                            <SidebarGroupLabel>Navegação</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={pathname?.startsWith('/bolao')}>
                                            <Link href="/bolao"><Swords /><span>Bolão</span></Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                     <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={pathname?.startsWith('/mvp')}>
                                            <Link href="/mvp"><Star /><span>MVP</span></Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={pathname?.startsWith('/store')}>
                                            <Link href="/store"><Store /><span>Loja</span></Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={pathname?.startsWith('/timao')}>
                                            <Link href="/timao"><ShieldCheck /><span>Espaço do Timão</span></Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                        {availableLeagues && (
                            <SidebarGroup>
                                <SidebarGroupLabel>Campeonatos</SidebarGroupLabel>
                                <SidebarGroupContent>
                                <SidebarMenu>
                                    <ChampionshipSidebarMenu availableLeagues={availableLeagues} />
                                </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        )}
                    </SidebarContent>
                </Sidebar>
                <SidebarInset>
                    <Header />
                    <div className="flex-1">
                        {children}
                    </div>
                    <BetSlip />
                    <AdBanner />
                </SidebarInset>
            </BetSlipProvider>
        </SidebarProvider>
    )
}
