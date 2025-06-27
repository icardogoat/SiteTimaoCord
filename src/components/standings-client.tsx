'use client';

import type { Standing, StandingEntry } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { buttonVariants } from './ui/button';

interface StandingsClientProps {
  standings: Standing[];
}

const getRankClass = (description: string | null | undefined) => {
    if (!description) return '';
    if (description.toLowerCase().includes('libertadores')) {
        return 'border-l-4 border-blue-500 bg-blue-500/10';
    }
    if (description.toLowerCase().includes('sul-americana')) {
        return 'border-l-4 border-sky-500 bg-sky-500/10';
    }
    if (description.toLowerCase().includes('relegation')) {
        return 'border-l-4 border-red-500 bg-red-500/10';
    }
    return '';
};

const FormIcons = ({ form }: { form: string | null | undefined }) => {
    if (!form) return <div className="h-4 w-12" />; // Placeholder for alignment
    const formResults = form.split('').slice(-5);

    const resultMapping: { [key: string]: { class: string; title: string; } } = {
        'W': { class: 'bg-green-500', title: 'Vitória' },
        'D': { class: 'bg-gray-500', title: 'Empate' },
        'L': { class: 'bg-red-500', title: 'Derrota' },
    };

    return (
      <TooltipProvider delayDuration={100}>
        <div className="flex justify-center items-center gap-1.5">
            {formResults.map((result, index) => {
                const mapping = resultMapping[result];
                if (!mapping) return null;
                return (
                    <Tooltip key={index}>
                        <TooltipTrigger asChild>
                            <span className={`h-2.5 w-2.5 block rounded-full ${mapping.class}`}></span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{mapping.title}</p>
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
      </TooltipProvider>
    );
};


function StandingsTable({ group }: { group: StandingEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 text-center">#</TableHead>
          <TableHead>Time</TableHead>
          <TableHead className="text-center">P</TableHead>
          <TableHead className="text-center hidden sm:table-cell">J</TableHead>
          <TableHead className="text-center hidden sm:table-cell">V</TableHead>
          <TableHead className="text-center hidden sm:table-cell">E</TableHead>
          <TableHead className="text-center hidden sm:table-cell">D</TableHead>
          <TableHead className="text-center hidden md:table-cell">SG</TableHead>
          <TableHead className="text-center hidden md:table-cell">Forma</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {group.map((entry) => {
          const isPalmeiras = entry.team.name === 'Palmeiras';
          const isSaoPaulo = entry.team.name === 'São Paulo';
          const teamName = isPalmeiras ? 'Peppa Pig' : isSaoPaulo ? 'Bambi' : entry.team.name;
          const logoClassName = isPalmeiras || isSaoPaulo ? 'rotate-180' : '';

          return (
          <TableRow key={entry.team.id} className={cn(getRankClass(entry.description), entry.team.name === 'Corinthians' && 'bg-primary/10')}>
            <TableCell className="text-center font-medium">{entry.rank}</TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={entry.team.logo} alt={teamName} data-ai-hint="team logo" className={logoClassName}/>
                  <AvatarFallback>{teamName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className={cn("font-medium truncate", entry.team.name === 'Corinthians' && 'font-bold text-primary')}>{teamName}</span>
              </div>
            </TableCell>
            <TableCell className="text-center font-bold">{entry.points}</TableCell>
            <TableCell className="text-center hidden sm:table-cell">{entry.all.played}</TableCell>
            <TableCell className="text-center hidden sm:table-cell">{entry.all.win}</TableCell>
            <TableCell className="text-center hidden sm:table-cell">{entry.all.draw}</TableCell>
            <TableCell className="text-center hidden sm:table-cell">{entry.all.lose}</TableCell>
            <TableCell className="text-center hidden md:table-cell">{entry.goalsDiff}</TableCell>
            <TableCell className="hidden md:table-cell">
                <FormIcons form={entry.form} />
            </TableCell>
          </TableRow>
        )})}
      </TableBody>
    </Table>
  );
}

export function StandingsClient({ standings }: StandingsClientProps) {
  if (!standings || standings.length === 0) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
         <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Tabelas</h1>
            <p className="text-muted-foreground">Classificação dos principais campeonatos.</p>
        </div>
        <Card>
            <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Não foi possível carregar as tabelas no momento.</p>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  const defaultTab = standings[0].league.name;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Tabelas</h1>
            <p className="text-muted-foreground">Classificação dos principais campeonatos.</p>
        </div>

        <Tabs defaultValue={defaultTab}>
            <TabsList className="relative w-full h-auto justify-start bg-transparent p-0">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex items-center gap-2 pb-2">
                        {standings.map(s => (
                            <TabsTrigger 
                                key={s.league.id} 
                                value={s.league.name}
                                className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                            >
                                {s.league.name}
                            </TabsTrigger>
                        ))}
                    </div>
                     <ScrollBar orientation="horizontal" className="invisible" />
                </ScrollArea>
            </TabsList>
            {standings.map(s => (
                <TabsContent key={s.league.id} value={s.league.name}>
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <Image src={s.league.logo} alt={s.league.name} width={40} height={40} data-ai-hint="league logo"/>
                            <div>
                                <CardTitle>{s.league.name}</CardTitle>
                                <CardDescription>Classificação atualizada</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {s.standings && s.standings.length > 0 && s.standings[0].length > 0 ? (
                                s.standings.map((group, index) => (
                                    <div key={index}>
                                        {s.standings.length > 1 && (
                                            <h3 className="text-lg font-semibold p-4 pt-0 border-b">Grupo {group[0]?.group.replace('Group ', '')}</h3>
                                        )}
                                        <StandingsTable group={group} />
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-4">
                                    <p>Este campeonato está em fase de mata-mata ou não possui uma tabela de classificação tradicional.</p>
                                    <Link 
                                        href={`/bet?league=${encodeURIComponent(s.league.name)}`} 
                                        className={buttonVariants({ variant: "outline" })}
                                    >
                                        Ver jogos disponíveis para este campeonato
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            ))}
        </Tabs>
    </div>
  );
}
