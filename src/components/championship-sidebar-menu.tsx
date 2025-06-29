
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { Globe, Home, Trophy, Star } from 'lucide-react';
import { getHighlightedLeagues } from '@/actions/settings-actions';

const championships = {
  // A categoria "destaques" foi removida daqui, pois agora é dinâmica.
  brasil: [
    'Série B', 'Brasileirão Série B',
    'Copa do Nordeste',
    'Copa SP de Futebol Júnior',
    'Campeonato Pernambucano',
    'Campeonato Carioca',
    'Supercopa do Brasil',
    'Campeonato Paulista',
    'Brasileirão Série A', // Adicionado aqui como fallback
  ],
  americas: [
    'Copa América',
    'CONMEBOL Recopa',
    'CONCACAF Champions Cup',
    'MLS',
    'Liga Pro',
    'Liga Profesional Argentina',
    'CONMEBOL Libertadores', // Adicionado aqui como fallback
    'CONMEBOL Sul-Americana', // Adicionado aqui como fallback
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
    'FIFA Club World Cup', // Adicionado aqui como fallback
    'Mundial de Clubes da FIFA', // Adicionado aqui como fallback
  ],
};


interface ChampionshipSidebarMenuProps {
  availableLeagues: string[];
}

export function ChampionshipSidebarMenu({ availableLeagues }: ChampionshipSidebarMenuProps) {
  return (
    <Suspense fallback={null}>
      <ChampionshipSidebarMenuInner availableLeagues={availableLeagues} />
    </Suspense>
  );
}

function ChampionshipSidebarMenuInner({ availableLeagues }: ChampionshipSidebarMenuProps) {
  const searchParams = useSearchParams();
  const selectedLeague = searchParams.get('league');
  const [highlightedLeagues, setHighlightedLeagues] = useState<string[]>([]);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);

  useEffect(() => {
    async function fetchHighlights() {
      setIsLoadingHighlights(true);
      const leagues = await getHighlightedLeagues();
      setHighlightedLeagues(leagues);
      setIsLoadingHighlights(false);
    }
    fetchHighlights();
  }, []);
  
  const highlightedLeaguesSet = new Set(highlightedLeagues);

  const championshipGroups = [
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
      list: group.list.filter(league => availableLeagues.includes(league) && !highlightedLeaguesSet.has(league))
  })).filter(group => group.list.length > 0);
  
  const uncategorizedLeagues = availableLeagues
    .filter(league => !allCategorizedLeagues.has(league) && !highlightedLeaguesSet.has(league))
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

  useEffect(() => {
    const defaultOpen = ['Destaques', ...filteredChampionshipGroups.map(g => g.name)];
    try {
        const storedState = localStorage.getItem('sidebarOpenMenus');
        setOpenMenus(storedState ? JSON.parse(storedState) : defaultOpen);
    } catch {
        setOpenMenus(defaultOpen);
    }
    setIsInitialStateLoaded(true);
  }, [availableLeagues]);

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
      {isLoadingHighlights ? (
         <SidebarMenuItem>
            <SidebarMenuSkeleton showIcon />
         </SidebarMenuItem>
      ) : highlightedLeagues.length > 0 && (
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => toggleMenu('Destaques')}
            data-state={openMenus.includes('Destaques') ? 'open' : 'closed'}
          >
            <Star />
            <span>Destaques</span>
          </SidebarMenuButton>
          {openMenus.includes('Destaques') && (
            <SidebarMenuSub>
              {highlightedLeagues.map((league) => (
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
      )}

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
