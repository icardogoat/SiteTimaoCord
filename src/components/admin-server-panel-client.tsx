'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { GuildDetails } from "@/actions/bot-config-actions";
import { Users, UserCheck, Gem, Calendar, Terminal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface AdminServerPanelClientProps {
    initialGuildDetails: GuildDetails | null;
    error: string | null;
}

const formatNumber = (num: number) => new Intl.NumberFormat('pt-BR').format(num);

export function AdminServerPanelClient({ initialGuildDetails, error }: AdminServerPanelClientProps) {
    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Erro ao Carregar Painel do Servidor</AlertTitle>
                <AlertDescription>
                    {error}
                    {error.includes("não está configurado") &&
                        <Link href="/admin/bot" className="font-bold underline ml-1">Ir para configurações</Link>
                    }
                </AlertDescription>
            </Alert>
        );
    }

    if (!initialGuildDetails) {
        return (
            <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Carregando...</AlertTitle>
                <AlertDescription>
                    Buscando informações do servidor...
                </AlertDescription>
            </Alert>
        );
    }
    
    const { name, iconUrl, memberCount, onlineCount, boostTier, boostCount, createdAt } = initialGuildDetails;

    return (
        <div className="flex flex-col gap-8">
             <div className="flex items-center gap-4">
                {iconUrl ? (
                    <Image
                        src={iconUrl}
                        alt={`${name} icon`}
                        width={64}
                        height={64}
                        className="rounded-full"
                        data-ai-hint="server icon"
                    />
                ) : (
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
                        {name.charAt(0)}
                    </div>
                )}
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">{name}</h1>
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
                        <div className="text-2xl font-bold">{formatNumber(memberCount)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Membros Online</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(onlineCount)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nível de Boost</CardTitle>
                        <Gem className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Tier {boostTier}</div>
                        <p className="text-xs text-muted-foreground">{formatNumber(boostCount)} boosts</p>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Informações Adicionais</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                       <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm font-medium">Servidor criado em: {createdAt}</span>
                       </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
