
'use client';

import { useState, useEffect } from 'react';
import type { Standing } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getAdminStandings, updateAllStandings } from '@/actions/admin-actions';
import { Loader2, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminStandingsClientProps {
    initialStandings: Standing[];
}

function LastUpdatedText({ date }: { date?: string | Date | null }) {
    const [timeAgo, setTimeAgo] = useState('Nunca');
    
    useEffect(() => {
        if (date) {
            setTimeAgo(formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR }));
        } else {
            setTimeAgo('Nunca');
        }
    }, [date]);

    return <>{timeAgo}</>;
}


export default function AdminStandingsClient({ initialStandings }: AdminStandingsClientProps) {
    const { toast } = useToast();
    const [standings, setStandings] = useState(initialStandings);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdate = async () => {
        setIsUpdating(true);
        toast({ title: 'Iniciando atualização...', description: 'Buscando dados das tabelas. Isso pode levar um momento.' });

        const result = await updateAllStandings();

        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
        } else {
            toast({ title: 'Atualização Parcial', description: result.message, variant: 'destructive' });
        }
        
        const updatedStandings = await getAdminStandings();
        setStandings(updatedStandings);
        setIsUpdating(false);
    };
    
    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <CardTitle>Gerenciar Tabelas de Classificação</CardTitle>
                    <CardDescription>
                        Atualize manualmente os dados das tabelas de classificação dos campeonatos.
                    </CardDescription>
                </div>
                <Button onClick={handleUpdate} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Atualizar Todas as Tabelas
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Campeonato</TableHead>
                            <TableHead className="text-right">Última Atualização</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {standings.length > 0 ? standings.map(standing => (
                            <TableRow key={standing.league.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Image src={standing.league.logo} alt={standing.league.name} width={24} height={24} className="rounded-full" data-ai-hint="league logo"/>
                                        <span className="font-medium">{standing.league.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    <LastUpdatedText date={standing.lastUpdated} />
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                                    Nenhuma tabela na base de dados. Clique em "Atualizar" para buscar.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
