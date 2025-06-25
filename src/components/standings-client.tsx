'use client';

import type { Standing, StandingEntry } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Image from 'next/image';

interface StandingsClientProps {
  standings: Standing[];
}

const getRankColor = (description: string | null | undefined) => {
    if (!description) return '';
    if (description.toLowerCase().includes('libertadores')) {
        return 'border-l-4 border-blue-500';
    }
    if (description.toLowerCase().includes('sul-americana')) {
        return 'border-l-4 border-sky-500';
    }
    if (description.toLowerCase().includes('relegation')) {
        return 'border-l-4 border-red-500';
    }
    return '';
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {group.map((entry) => (
          <TableRow key={entry.team.id} className={getRankColor(entry.description)}>
            <TableCell className="text-center font-medium">{entry.rank}</TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={entry.team.logo} alt={entry.team.name} data-ai-hint="team logo"/>
                  <AvatarFallback>{entry.team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">{entry.team.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-center font-bold">{entry.points}</TableCell>
            <TableCell className="text-center hidden sm:table-cell">{entry.all.played}</TableCell>
            <TableCell className="text-center hidden sm:table-cell">{entry.all.win}</TableCell>
            <TableCell className="text-center hidden sm:table-cell">{entry.all.draw}</TableCell>
            <TableCell className="text-center hidden sm:table-cell">{entry.all.lose}</TableCell>
            <TableCell className="text-center hidden md:table-cell">{entry.goalsDiff}</TableCell>
          </TableRow>
        ))}
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
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                {standings.map(s => (
                    <TabsTrigger key={s.league.id} value={s.league.name}>{s.league.name}</TabsTrigger>
                ))}
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
                            {s.standings.map((group, index) => (
                                <div key={index}>
                                    {s.standings.length > 1 && (
                                        <h3 className="text-lg font-semibold p-4 pt-0">Grupo {String.fromCharCode(65 + index)}</h3>
                                    )}
                                    <StandingsTable group={group} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            ))}
        </Tabs>
    </div>
  );
}
