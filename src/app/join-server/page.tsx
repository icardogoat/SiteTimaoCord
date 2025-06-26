
'use server';

import { getBotConfig } from '@/actions/bot-config-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DiscordLogo, FielBetLogo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ServerCrash, XCircle } from 'lucide-react';

const errorDetails: { [key: string]: { title: string; description: string; icon: React.ElementType } } = {
  Callback: {
    title: 'Acesso Negado',
    description: 'Para usar a plataforma FielBet, você precisa ser um membro do nosso servidor do Discord.',
    icon: AlertTriangle,
  },
  Configuration: {
    title: 'Erro de Configuração',
    description: 'Ocorreu um problema de configuração no servidor que impede o login. Por favor, contate um administrador.',
    icon: ServerCrash,
  },
  AccessDenied: {
    title: 'Acesso Negado',
    description: 'Seu acesso foi recusado. Isso pode acontecer se você negar as permissões no Discord. Tente novamente.',
    icon: XCircle,
  },
  Default: {
    title: 'Erro no Login',
    description: 'Ocorreu um erro inesperado durante a autenticação. Por favor, tente novamente.',
    icon: AlertTriangle,
  },
};

export default async function JoinServerPage({ searchParams }: { searchParams?: { error?: string }}) {
    const { guildInviteUrl } = await getBotConfig();
    const errorType = searchParams?.error || 'Callback'; // Default to the most common error
    const details = errorDetails[errorType] || errorDetails.Default;
    const Icon = details.icon;

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
             <Link href="/" className="flex items-center justify-center mb-8" prefetch={false}>
              <FielBetLogo className="h-8 w-8 text-primary" />
              <span className="ml-3 text-2xl font-bold font-headline text-primary">Timaocord</span>
            </Link>
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                        <Icon className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="mt-4">{details.title}</CardTitle>
                    <CardDescription>
                        {details.description}
                    </CardDescription>
                </CardHeader>
                
                {errorType === 'Callback' && (
                     <CardContent>
                        <p className="text-center text-muted-foreground">
                            Clique no botão abaixo para entrar no servidor. Após entrar, tente fazer o login novamente.
                        </p>
                    </CardContent>
                )}

                <CardFooter className="flex-col gap-4">
                    {errorType === 'Callback' && guildInviteUrl && (
                         <Button asChild className="w-full" size="lg">
                            <Link href={guildInviteUrl} target="_blank" rel="noopener noreferrer">
                                <DiscordLogo className="mr-2 h-5 w-5" />
                                Entrar no Servidor
                            </Link>
                        </Button>
                    )}
                     {errorType === 'Callback' && !guildInviteUrl && (
                        <p className="text-center text-sm text-destructive w-full">
                           O link de convite para o servidor não está configurado. Por favor, entre em contato com um administrador.
                        </p>
                    )}
                    <Button asChild variant="link" className="w-full">
                        <Link href="/">
                            Voltar e Tentar Novamente
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
