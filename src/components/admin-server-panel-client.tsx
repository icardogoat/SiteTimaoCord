
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { GuildDetails, RoleWithMemberCount, DbStats } from "@/types";
import { Users, UserCheck, Gem, Calendar, Terminal, Database, ServerCrash, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "./ui/progress";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { cleanupOldData } from "@/actions/admin-actions";

interface AdminServerPanelClientProps {
    initialGuildDetails: GuildDetails | null;
    initialRolesWithCounts: RoleWithMemberCount[];
    initialDbStats: DbStats | null;
    error: string | null;
}

const formatNumber = (num: number) => new Intl.NumberFormat('pt-BR').format(num);

export function AdminServerPanelClient({ initialGuildDetails, initialRolesWithCounts, initialDbStats, error }: AdminServerPanelClientProps) {
    const { toast } = useToast();
    const [isCleaning, setIsCleaning] = useState(false);
    const [isCleanDialogOpen, setIsCleanDialogOpen] = useState(false);

    const handleCleanup = async () => {
        setIsCleaning(true);
        setIsCleanDialogOpen(false);
        toast({ title: "Iniciando limpeza...", description: "Aguarde enquanto os dados antigos são removidos." });

        const result = await cleanupOldData();

        if (result.success) {
            toast({
                title: "Limpeza Concluída!",
                description: result.details.join(' '),
                duration: 9000
            });
        } else {
            toast({
                title: "Erro na Limpeza",
                description: result.message,
                variant: "destructive",
            });
        }
        setIsCleaning(false);
    };

    const toHexColor = (decimal: number) => {
        if (decimal === 0) return 'hsl(var(--muted-foreground))';
        return `#${decimal.toString(16).padStart(6, '0')}`;
    };

    const dbUsagePercent = initialDbStats ? (parseFloat(initialDbStats.dataSize) / 512) * 100 : 0;
    const isDbFull = dbUsagePercent > 90;
    
    const dbStatsContent = initialDbStats && (
         <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database /> Status do Banco de Dados</CardTitle>
                <CardDescription>
                    Monitoramento do uso do banco de dados principal (<code className="font-mono bg-muted px-1 rounded-sm">{initialDbStats.db}</code>). 
                    O plano gratuito do MongoDB Atlas tem um limite de 512MB.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isDbFull && (
                    <Alert variant="destructive">
                        <ServerCrash className="h-4 w-4" />
                        <AlertTitle>Atenção: Banco de Dados Quase Cheio!</AlertTitle>
                        <AlertDescription>
                            Seu banco de dados está com <strong>{dbUsagePercent.toFixed(1)}%</strong> da capacidade. 
                            Para evitar interrupções, atualize a variável de ambiente <code className="font-mono text-xs bg-destructive/20 p-1 rounded-sm">MONGODB_URI</code> em seu arquivo <code className="font-mono text-xs bg-destructive/20 p-1 rounded-sm">.env</code> com uma nova URL de conexão e reinicie a aplicação.
                        </AlertDescription>
                    </Alert>
                )}
                <Progress value={dbUsagePercent} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                    <div>
                        <p className="text-muted-foreground">Uso de Dados</p>
                        <p className="font-bold">{initialDbStats.dataSize} MB</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground">Uso em Disco</p>
                        <p className="font-bold">{initialDbStats.storageSize} MB</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground">Coleções</p>
                        <p className="font-bold">{initialDbStats.collections}</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground">Documentos</p>
                        <p className="font-bold">{formatNumber(initialDbStats.objects)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
    
    const guildDetailsContent = initialGuildDetails && (
        <>
            <div className="flex items-center gap-4">
                {initialGuildDetails.iconUrl ? (
                    <Image
                        src={initialGuildDetails.iconUrl}
                        alt={`${initialGuildDetails.name} icon`}
                        width={64}
                        height={64}
                        className="rounded-full"
                        data-ai-hint="server icon"
                    />
                ) : (
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
                        {initialGuildDetails.name.charAt(0)}
                    </div>
                )}
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">{initialGuildDetails.name}</h1>
                    <p className="text-muted-foreground">Visão geral do seu servidor do Discord.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Membros Totais</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(initialGuildDetails.memberCount)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Membros Online</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(initialGuildDetails.onlineCount)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nível de Boost</CardTitle>
                        <Gem className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Tier {initialGuildDetails.boostTier}</div>
                        <p className="text-xs text-muted-foreground">{formatNumber(initialGuildDetails.boostCount)} boosts</p>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Informações Adicionais</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                       <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm font-medium">Servidor criado em: {initialGuildDetails.createdAt}</span>
                       </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
    
    const rolesContent = (
         <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Cargos do Servidor</CardTitle>
                <CardDescription>
                    Lista de cargos e o número de membros em cada um. Pode ser necessário ativar a "Server Members Intent" para o bot.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cargo</TableHead>
                            <TableHead className="text-right">Membros</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialRolesWithCounts.map((role) => (
                            <TableRow key={role.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="h-4 w-4 rounded-full border border-border" 
                                            style={{ backgroundColor: toHexColor(role.color) }}
                                        />
                                        <span className="font-medium">{role.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-bold">{formatNumber(role.memberCount)}</TableCell>
                            </TableRow>
                        ))}
                        {initialRolesWithCounts.length === 0 && !error?.includes('cargo') && (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                                    Nenhum cargo encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    return (
        <>
            <div className="flex flex-col gap-8">
                {error && (
                    <Alert variant="destructive">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Erro ao Carregar Painel do Servidor</AlertTitle>
                        <AlertDescription>
                            {error.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                            {error.includes("não está configurado") &&
                                <Link href="/admin/bot" className="font-bold underline ml-1">Ir para configurações</Link>
                            }
                        </AlertDescription>
                    </Alert>
                )}
                
                {!initialGuildDetails && !error && (
                    <Alert>
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Carregando...</AlertTitle>
                        <AlertDescription>
                            Buscando informações do servidor... Isso pode levar alguns segundos.
                        </AlertDescription>
                    </Alert>
                )}
                
                {dbStatsContent}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trash2 /> Manutenção do Banco de Dados</CardTitle>
                        <CardDescription>
                            Remova dados antigos para otimizar o espaço e a performance.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Esta ação excluirá permanentemente:
                        </p>
                        <ul className="list-disc pl-5 text-sm space-y-1 mb-6 text-muted-foreground">
                            <li>Notificações com mais de 30 dias.</li>
                            <li>Partidas finalizadas com mais de 90 dias.</li>
                            <li>Votações de MVP encerradas com mais de 90 dias.</li>
                        </ul>
                        <Button
                            variant="destructive"
                            onClick={() => setIsCleanDialogOpen(true)}
                            disabled={isCleaning}
                        >
                            {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Iniciar Limpeza de Dados
                        </Button>
                    </CardContent>
                </Card>

                {initialGuildDetails && guildDetailsContent}
                {initialGuildDetails && rolesContent}
            </div>

            <AlertDialog open={isCleanDialogOpen} onOpenChange={setIsCleanDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Limpeza de Dados</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação é irreversível e excluirá dados permanentemente. Você tem certeza que deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCleanup} className="bg-destructive hover:bg-destructive/90">
                            Confirmar e Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
