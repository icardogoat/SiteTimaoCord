
'use server';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FielBetLogo } from '@/components/icons';
import { LoginButtons } from '@/components/login-buttons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  CredentialsSignin: {
      title: 'Login Inválido',
      description: 'Verifique suas credenciais e tente novamente.',
      icon: AlertTriangle,
  }
};

export default async function LoginPage({ searchParams }: { searchParams?: { error?: string }}) {
    const errorType = searchParams?.error;
    const error = errorType ? (errorDetails[errorType] || errorDetails.Default) : null;

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
             <Link href="/" className="flex items-center justify-center mb-8" prefetch={false}>
              <FielBetLogo className="h-8 w-8 text-primary" />
              <span className="ml-3 text-2xl font-bold font-headline text-primary">Timaocord</span>
            </Link>
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Entrar</CardTitle>
                    <CardDescription>
                        Acesse sua conta para começar a apostar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {error && (
                         <Alert variant="destructive">
                            <error.icon className="h-4 w-4" />
                            <AlertTitle>{error.title}</AlertTitle>
                            <AlertDescription>{error.description}</AlertDescription>
                        </Alert>
                    )}
                    <LoginButtons />
                </CardContent>
            </Card>
        </div>
    );
}
