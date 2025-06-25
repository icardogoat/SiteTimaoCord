'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Globe, Home, Trophy, Star } from 'lucide-react';

const championships = {
  destaques: [
    'Brasileirão Série A',
    'Série A',
    'Copa do Brasil',
    'CONMEBOL Libertadores',
    'CONMEBOL Sul-Americana',
    'Mundial de Clubes da FIFA',
    'FIFA Club World Cup',
  ],
  brasil: [
    'Série B', 'Brasileirão Série B',
    'Copa do Nordeste',
    'Copa SP de Futebol Júnior',
    'Campeonato Pernambucano',
    'Campeonato Carioca',
    'Supercopa do Brasil',
    'Campeonato Paulista',
  ],
  americas: [
    'Copa América',
    'CONMEBOL Recopa',
    'CONCACAF Champions Cup',
    'MLS',
    'Liga Pro',
    'Liga Profesional Argentina',
  ],
  europa: [
    'UEFA Champions League',
    'UEFA Europa League',
    'UEFA Nations League',
    'Premier League',
    'Bundesliga',
    'La Liga',
    'Ligue 1',
    'Serie A',
    'Primeira Liga',
    'Eredivisie',
    'UEFA Conference League',
    'Supercopa da UEFA',
  ],
  asia: [
    'AFC Champions League',
    'Copa da Ásia',
    'J1 League'
  ],
  africa: [
    'CAF Champions League',
    'Copa Africana de Nações',
  ],
  oceania: [
    'Northern NSW NPL',
  ],
  mundo: [
    'Copa do Mundo',
    'Copa do Mundo Feminina',
  ],
};


interface ChampionshipSidebarMenuProps {
  availableLeagues: string[];
}

export function ChampionshipSidebarMenu({ availableLeagues }: ChampionshipSidebarMenuProps) {
  const searchParams = useSearchParams();
  const selectedLeague = searchParams.get('league');

  const championshipGroups = [
    { name: 'Destaques', list: championships.destaques, icon: Star },
    { name: 'Brasil', list: championships.brasil, icon: Trophy },
    { name: 'Américas', list: championships.americas, icon: Globe },
    { name: 'Europa', list: championships.europa, icon: Globe },
    { name: 'Ásia', list: championships.asia, icon: Globe },
    { name: 'África', list: championships.africa, icon: Globe },
    { name: 'Oceania', list: championships.oceania, icon: Globe },
    { name: 'Mundo', list: championships.mundo, icon: Globe },
  ];
  
  const allCategorizedLeagues = new Set(championshipGroups.flatMap(g => g.list));

  const filteredChampionshipGroups = championshipGroups.map(group => ({
      ...group,
      list: group.list.filter(league => availableLeagues.includes(league))
  })).filter(group => group.list.length > 0);
  
  const uncategorizedLeagues = availableLeagues
    .filter(league => !allCategorizedLeagues.has(league))
    .sort();

  if (uncategorizedLeagues.length > 0) {
    filteredChampionshipGroups.push({
      name: 'Outros',
      list: uncategorizedLeagues,
      icon: Globe
    });
  }

  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isInitialStateLoaded, setIsInitialStateLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const defaultOpen = filteredChampionshipGroups.map(g => g.name);
    try {
        const storedState = localStorage.getItem('sidebarOpenMenus');
        setOpenMenus(storedState ? JSON.parse(storedState) : defaultOpen);
    } catch {
        setOpenMenus(defaultOpen);
    }
    setIsInitialStateLoaded(true);
  // Using availableLeagues as a dependency because filteredChampionshipGroups depends on it.
  // This ensures the default state is correct if the leagues change.
  }, [availableLeagues]);

  // Save state to localStorage on change
  useEffect(() => {
    if (isInitialStateLoaded) {
        try {
            localStorage.setItem('sidebarOpenMenus', JSON.stringify(openMenus));
        } catch (error) {
            console.error("Failed to save sidebar state to localStorage:", error);
        }
    }
  }, [openMenus, isInitialStateLoaded]);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={!selectedLeague}>
            <Link href="/bet">
                <Home />
                <span>Todas as Partidas</span>
            </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {filteredChampionshipGroups.map((group) => (
        <SidebarMenuItem key={group.name}>
          <SidebarMenuButton
            onClick={() => toggleMenu(group.name)}
            data-state={openMenus.includes(group.name) ? 'open' : 'closed'}
          >
            <group.icon />
            <span>{group.name}</span>
          </SidebarMenuButton>
          {openMenus.includes(group.name) && (
            <SidebarMenuSub>
              {group.list.map((league) => (
                <SidebarMenuSubItem key={league}>
                  <SidebarMenuSubButton
                    href={`/bet?league=${encodeURIComponent(league)}`}
                    isActive={selectedLeague === league}
                  >
                    <span>{league}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      ))}
    </>
  );
}
