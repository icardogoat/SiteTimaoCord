
"use client";

import * as React from 'react';
import Link from 'next/link';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { FielBetLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Wallet, Ticket, Bell, Trophy, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';

const notifications = [
    {
        id: '1',
        title: 'Aposta Ganha!',
        description: 'Sua aposta em Corinthians vs Palmeiras foi vitoriosa.',
        time: '5 min atrás',
        read: false,
    },
    {
        id: '2',
        title: 'Novo Bônus Disponível',
        description: 'Você recebeu um bônus de R$20 para apostar.',
        time: '2 horas atrás',
        read: false,
    },
    {
        id: '3',
        title: 'Lembrete de Partida',
        description: 'Flamengo vs Vasco da Gama começa em 1 hora.',
        time: '1 dia atrás',
        read: true,
    },
];

export function Header() {
  const { data: session } = useSession();
  const { isMobile } = useSidebar();
  const unreadCount = notifications.filter(n => !n.read).length;

  const user = session?.user;
  const userName = user?.name ?? 'Usuário';
  const userImage = user?.image;
  const userBalance = user?.balance ?? 0;
  const userFallback = userName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        {isMobile && <SidebarTrigger />}
        <div className="hidden items-center gap-2 sm:flex">
          <FielBetLogo className="size-7 text-primary" />
          <h1 className="text-lg font-semibold font-headline text-primary">FielBet</h1>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
          <Wallet className="size-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">R$ {userBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {unreadCount}
                    </span>
                )}
                 <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 md:w-96">
            <DropdownMenuLabel className='px-3 py-2'>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className='max-h-80 overflow-y-auto'>
                {notifications.length > 0 ? (
                    notifications.map((notification) => (
                        <DropdownMenuItem key={notification.id} asChild className="p-0">
                           <Link href="#" className={cn(
                               "flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors hover:bg-accent w-full",
                               !notification.read && "bg-accent/50 hover:bg-accent"
                           )}>
                             <div className='flex items-center w-full'>
                               <p className={cn(
                                   "text-sm font-medium",
                                   !notification.read ? "text-foreground" : "text-muted-foreground"
                                )}>{notification.title}</p>
                               <p className="ml-auto text-xs text-muted-foreground">{notification.time}</p>
                             </div>
                                <p className={cn(
                                    "text-xs w-full text-left",
                                    !notification.read ? "text-foreground/80" : "text-muted-foreground"
                                    )}>{notification.description}</p>
                           </Link>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <p className='p-4 text-sm text-center text-muted-foreground'>Nenhuma notificação nova.</p>
                )}
            </div>
             {notifications.length > 0 && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/notifications" className="flex items-center justify-center p-2 text-sm font-medium text-primary">
                            Ver todas as notificações
                        </Link>
                    </DropdownMenuItem>
                </>
             )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarImage src={userImage ?? undefined} alt={userName} />
              <AvatarFallback>{userFallback}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/wallet">
                <Wallet className="mr-2 h-4 w-4" />
                <span>Carteira</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/my-bets">
                <Ticket className="mr-2 h-4 w-4" />
                <span>Minhas Apostas</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/ranking">
                <Trophy className="mr-2 h-4 w-4" />
                <span>Ranking</span>
              </Link>
            </DropdownMenuItem>
            {user?.admin && (
                <DropdownMenuItem asChild>
                    <Link href="/admin">
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        <span>Admin</span>
                    </Link>
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Deslogar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
