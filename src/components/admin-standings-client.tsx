
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Standing, StandingConfigEntry, StandingEntry } from '@/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updateAllStandings, updateStandingsConfig } from '@/actions/admin-actions';
import { getStandings } from '@/actions/standings-actions';
import { Loader2, RefreshCw, Trash2, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Image from 'next/image';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Helper functions and components from standings-client
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
    if (!form) return <div className="h-4 w-12" />;
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

const StandingsTable = ({ group }: { group: StandingEntry[] }) => {
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

const EmptyStandingsTable = ({ leagueName }: { leagueName: string }) => {
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
                <TableRow>
                    <TableCell colSpan={9} className="h-48">
                        <div className="flex flex-col items-center justify-center gap-4 text-center">
                            <p className="text-muted-foreground">Este campeonato está em fase de mata-mata ou não possui uma tabela de classificação tradicional.</p>
                             <Link 
                                href={`/bet?league=${encodeURIComponent(leagueName)}`} 
                                className={buttonVariants({ variant: "outline" })}
                            >
                                Ver jogos disponíveis para este campeonato
                            </Link>
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}

// Form schemas
const configSchema = z.object({
  leagueId: z.coerce.number().min(1, "O ID da Liga é obrigatório."),
  isActive: z.boolean(),
});

const formSchema = z.object({
  config: z.array(configSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminStandingsClientProps {
    initialConfig: StandingConfigEntry[];
    initialStandings: Standing[];
}

export default function AdminStandingsClient({ initialConfig, initialStandings }: AdminStandingsClientProps) {
    const { toast } = useToast();
    const [isUpdatingAll, setIsUpdatingAll] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [standings, setStandings] = useState(initialStandings);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            config: initialConfig || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "config",
    });

    const handleUpdate = async () => {
        setIsUpdatingAll(true);
        toast({ title: 'Iniciando atualização...', description: 'Buscando dados das tabelas. Isso pode levar um momento.' });
        const result = await updateAllStandings();
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            const newStandings = await getStandings();
            setStandings(newStandings);
        } else {
            toast({ title: 'Erro na Atualização', description: result.message, variant: 'destructive' });
        }
        setIsUpdatingAll(false);
    };

    const onSubmit = async (values: FormValues) => {
        setIsSaving(true);
        const result = await updateStandingsConfig(values.config);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const defaultTab = standings.length > 0 ? standings[0].league.name : '';

    return (
        <div className="space-y-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Gerenciar Tabelas de Classificação</CardTitle>
                            <CardDescription>
                                Adicione o ID das ligas da API-Football que você deseja monitorar e ative-as para exibição.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID da Liga</TableHead>
                                        <TableHead className="w-24 text-center">Ativo</TableHead>
                                        <TableHead className="w-16 text-right">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`config.${index}.leagueId`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input type="number" placeholder="Ex: 71" {...field} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <FormField
                                                    control={form.control}
                                                    name={`config.${index}.isActive`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Switch
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => append({ leagueId: 0, isActive: true })}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Campeonato
                            </Button>
                            <div className="flex gap-2">
                                <Button type="submit" disabled={isSaving || isUpdatingAll}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Salvar Configurações
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </form>
            </Form>

            <Card>
                <CardHeader>
                    <CardTitle>Pré-visualização das Tabelas</CardTitle>
                    <CardDescription>
                        Veja como as tabelas ativas estão sendo exibidas para os usuários.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {standings.length > 0 ? (
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
                                                <EmptyStandingsTable leagueName={s.league.name} />
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            ))}
                        </Tabs>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Nenhuma tabela ativa para exibir. Ative campeonatos e atualize os dados.</p>
                    )}
                </CardContent>
                 <CardFooter className="border-t pt-6">
                     <Button type="button" onClick={handleUpdate} disabled={isUpdatingAll || isSaving}>
                        {isUpdatingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Atualizar Dados das Tabelas
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
