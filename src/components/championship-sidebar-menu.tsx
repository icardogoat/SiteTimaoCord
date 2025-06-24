'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Globe, Home, Trophy } from 'lucide-react';

const championships = {
  brasil: [
    'Série A', 'Brasileirão Série A',
    'Série B', 'Brasileirão Série B',
    'Copa do Brasil',
    'Copa do Nordeste',
    'Copa SP de Futebol Júnior',
    'Campeonato Pernambucano',
    'Campeonato Carioca',
    'Supercopa do Brasil',
    'Campeonato Paulista',
  ],
  americas: [
    'CONMEBOL Libertadores',
    'CONMEBOL Sul-Americana',
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
    'Liga Pro',
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
    'Mundial de Clubes da FIFA',
    'FIFA Club World Cup',
  ],
};


interface ChampionshipSidebarMenuProps {
  availableLeagues: string[];
}

export function ChampionshipSidebarMenu({ availableLeagues }: ChampionshipSidebarMenuProps) {
  const searchParams = useSearchParams();
  const selectedLeague = searchParams.get('league');

  const championshipGroups = [
    { name: 'Brasil', list: championships.brasil, icon: Trophy },
    { name: 'Américas', list: championships.americas, icon: Globe },
    { name: 'Europa', list: championships.europa, icon: Globe },
    { name: 'Ásia', list: championships.asia, icon: Globe },
    { name: 'África', list: championships.africa, icon: Globe },
    { name: 'Oceania', list: championships.oceania, icon: Globe },
    { name: 'Mundo', list: championships.mundo, icon: Globe },
  ];

  const filteredChampionshipGroups = championshipGroups.map(group => ({
      ...group,
      list: group.list.filter(league => availableLeagues.includes(league))
  })).filter(group => group.list.length > 0);

  const [openMenus, setOpenMenus] = useState<string[]>(filteredChampionshipGroups.map(g => g.name));

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
