'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
    Bot, Home, Megaphone, Menu, Receipt, Server, Settings, ShoppingBag, Star, Ticket, Trophy, Users, FilePen, Tv, PartyPopper, Layers, Sparkles, Gift, QrCode, HelpCircle,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FielBetLogo } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AvatarFallbackText } from "@/components/avatar-fallback-text";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider } from "@/components/ui/sidebar";

interface AdminLayoutProps {
    children: ReactNode;
}

const allNavGroups = [
  {
    title: 'Principal',
    links: [
      { href: "/admin/dashboard", label: "Dashboard", icon: Home, adminOnly: true },
    ]
  },
  {
    title: 'Gerenciamento',
    links: [
      { href: "/admin/matches", label: "Partidas", icon: Trophy, adminOnly: true },
      { href: "/admin/bets", label: "Apostas", icon: Ticket, adminOnly: true },
      { href: "/admin/users", label: "Usuários", icon: Users, adminOnly: true },
      { href: "/admin/purchases", label: "Compras", icon: Receipt, adminOnly: true },
    ]
  },
  {
    title: 'Comunidade & Eventos',
    links: [
        { href: "/admin/highlights", label: "Destaques", icon: Sparkles, adminOnly: true },
        { href: "/admin/mvp", label: "MVP Votação", icon: Star, adminOnly: true },
        { href: "/admin/level", label: "Níveis", icon: Layers, adminOnly: true },
        { href: "/admin/announcements", label: "Posts", icon: FilePen, adminOnly: false },
        { href: "/admin/stream", label: "Transmissão", icon: Tv, adminOnly: true },
        { href: "/admin/events", label: "Eventos", icon: PartyPopper, adminOnly: true },
        { href: "/admin/quiz", label: "Quiz", icon: HelpCircle, adminOnly: true },
    ]
  },
  {
    title: 'Monetização',
    links: [
        { href: "/admin/store", label: "Loja", icon: ShoppingBag, adminOnly: true },
        { href: "/admin/ads", label: "Anúncios", icon: Megaphone, adminOnly: true },
        { href: "/admin/rewards", label: "Recompensas", icon: Gift, adminOnly: true },
        { href: "/admin/codes", label: "Códigos", icon: QrCode, adminOnly: true },
    ]
  },
  {
    title: 'Configuração',
    links: [
        { href: "/admin/server", label: "Servidor", icon: Server, adminOnly: true },
        { href: "/admin/bot", label: "Bot", icon: Bot, adminOnly: true },
        { href: "/admin/settings", label: "Configurações", icon: Settings, adminOnly: true },
    ]
  }
];

const NavLink = ({ href, label, icon: Icon, pathname }: { href: string; label: string; icon: React.ElementType; pathname: string }) => (
  <Link
    href={href}
    className={cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-all hover:text-primary",
      pathname.startsWith(href) && "bg-muted text-primary font-semibold"
    )}
  >
    <Icon className="h-4 w-4" />
    {label}
  </Link>
);


export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const isVip = user?.isVip ?? false;

  const navGroups = useMemo(() => {
    if (!user) return [];
    return allNavGroups.map(group => ({
        ...group,
        links: group.links.filter(link => {
            if (!link.adminOnly) {
               return user.admin || user.canPost;
            }
            return user.admin;
        })
    })).filter(group => group.links.length > 0);
  }, [user]);
  
  const activeGroupValue = useMemo(() => {
      const activeGroup = navGroups.find(group => group.links.some(link => pathname.startsWith(link.href)));
      return activeGroup?.title;
  }, [navGroups, pathname]);

  const renderNav = () => (
    <div className="w-full space-y-1">
      {navGroups.map((group) => {
        const isActiveGroup = activeGroupValue === group.title;
        return (
          <div key={group.title} className="group">
            <div className="flex items-center rounded-md px-3 py-2 text-base font-medium text-foreground lg:text-sm cursor-default hover:bg-muted">
              {group.title}
            </div>
            <div className={cn(
                "hidden group-hover:block pt-1 pl-4 space-y-1",
                isActiveGroup && "block"
            )}>
               <nav className="grid items-start font-medium">
                  {group.links.map(link => (
                      <NavLink key={link.href} {...link} pathname={pathname} />
                  ))}
               </nav>
            </div>
          </div>
        );
      })}
    </div>
  );

  const userName = user?.name ?? 'Admin';
  const userImage = user?.image ?? 'https://placehold.co/40x40.png';

  return (
    <SidebarProvider>
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
                <FielBetLogo className="h-6 w-6 text-primary" />
                <span className="text-lg">Painel Admin</span>
                </Link>
            </div>
            <ScrollArea className="flex-1">
                <div className="px-2 py-4 lg:px-4">
                {renderNav()}
                </div>
            </ScrollArea>
            </div>
        </div>
        <div className="flex flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden"
                        >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col p-0">
                        <SheetHeader className="text-left border-b pb-4 pt-6 px-6">
                            <SheetTitle>
                                <Link
                                    href="/admin/dashboard"
                                    className="flex items-center gap-2 text-lg font-semibold"
                                >
                                    <FielBetLogo className="h-6 w-6" />
                                    <span>Painel Admin</span>
                                </Link>
                            </SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="flex-1">
                            <div className="px-2 py-4 lg:px-4">
                            {renderNav()}
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            <div className="w-full flex-1" />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Avatar className={cn("h-9 w-9 cursor-pointer", isVip && "ring-2 ring-offset-2 ring-vip ring-offset-muted")}>
                        <AvatarImage src={userImage} alt="Admin Avatar" data-ai-hint="user avatar" />
                        <AvatarFallback><AvatarFallbackText name={userName} /></AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                {(user?.admin || user?.canPost) && <DropdownMenuItem asChild><Link href="/admin/dashboard">Painel</Link></DropdownMenuItem>}
                <DropdownMenuItem asChild><Link href="/bet">Voltar ao App</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>Deslogar</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/20">
            {children}
            </main>
        </div>
        </div>
    </SidebarProvider>
  )
}
