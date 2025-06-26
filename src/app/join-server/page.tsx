
'use server';

import { getBotConfig } from '@/actions/bot-config-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DiscordLogo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default async function JoinServerPage() {
    const { guildInviteUrl } = await getBotConfig();

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="mt-4">Acesso Negado</CardTitle>
                    <CardDescription>
                        Para usar a plataforma FielBet, você precisa ser um membro do nosso servidor do Discord.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Clique no botão abaixo para entrar no servidor. Após entrar, tente fazer o login novamente.
                    </p>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    {guildInviteUrl ? (
                         <Button asChild className="w-full" size="lg">
                            <Link href={guildInviteUrl} target="_blank" rel="noopener noreferrer">
                                <DiscordLogo className="mr-2 h-5 w-5" />
                                Entrar no Servidor
                            </Link>
                        </Button>
                    ) : (
                        <p className="text-center text-sm text-destructive w-full">
                           O link de convite para o servidor não está configurado. Por favor, entre em contato com um administrador.
                        </p>
                    )}
                    <Button asChild variant="link" className="w-full">
                        <Link href="/">
                            Voltar para o Login
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
