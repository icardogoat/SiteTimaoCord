
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { StandingConfigEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updateAllStandings, updateStandingsConfig } from '@/actions/admin-actions';
import { Loader2, RefreshCw, Trash2, PlusCircle } from 'lucide-react';

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
}

export default function AdminStandingsClient({ initialConfig }: AdminStandingsClientProps) {
    const { toast } = useToast();
    const [isUpdatingAll, setIsUpdatingAll] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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

    return (
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
                             <Button type="button" onClick={handleUpdate} disabled={isUpdatingAll || isSaving}>
                                {isUpdatingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Atualizar Tabelas Ativas
                            </Button>
                            <Button type="submit" disabled={isSaving || isUpdatingAll}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Configurações
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
