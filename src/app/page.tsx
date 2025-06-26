import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DiscordLogo } from '@/components/icons';
import { LoginButton } from '@/components/login-button';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { getBotConfig } from '@/actions/bot-config-actions';
import Image from 'next/image';

export default async function TimaocordHome() {
  const session = await getServerSession(authOptions);
  const { guildInviteUrl } = await getBotConfig();

  if (session) {
    redirect('/bet');
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-28 flex items-center justify-center">
        <Link href="/" className="flex items-center justify-center" prefetch={false}>
          <Image
            src="https://i.imgur.com/xD76hcl.png"
            alt="TimãoCord Logo"
            width={500}
            height={127}
            className="h-24 w-auto"
            priority
            data-ai-hint="logo"
          />
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
          <Button size="lg" asChild disabled={!guildInviteUrl}>
            <Link href={guildInviteUrl || '#'} target="_blank" rel="noopener noreferrer">
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
