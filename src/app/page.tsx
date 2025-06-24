import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FielBetLogo, DiscordLogo } from '@/components/icons';
import { LoginButton } from '@/components/login-button';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function TimaocordHome() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/bet');
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center justify-center" prefetch={false}>
          <FielBetLogo className="h-7 w-7 text-primary" />
          <span className="ml-2 text-xl font-bold font-headline text-primary">Timaocord</span>
        </Link>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-headline tracking-tighter mb-4">
          Bem-vindo ao Timaocord
        </h1>
        <p className="max-w-[600px] text-muted-foreground md:text-xl mb-8">
          Sua comunidade e plataforma de apostas para os verdadeiros fiéis.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" asChild>
            <Link href="https://discord.gg" target="_blank" rel="noopener noreferrer">
              <DiscordLogo className="mr-2 h-5 w-5" />
              Entrar no Servidor
            </Link>
          </Button>
          <LoginButton />
        </div>
      </main>
      <footer className="flex items-center justify-center p-6 text-sm text-muted-foreground">
        <p>© 2025 Timaocord. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
