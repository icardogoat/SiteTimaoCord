"use client";

import * as React from 'react';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { FielBetLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Header() {
  const { isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        {isMobile && <SidebarTrigger />}
        <div className="hidden items-center gap-2 sm:flex">
          <FielBetLogo className="size-7 text-primary" />
          <h1 className="text-lg font-semibold font-headline text-primary">FielBet</h1>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium hidden sm:inline">Bem-vindo, Fiel!</span>
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="user avatar" />
            <AvatarFallback>BT</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
