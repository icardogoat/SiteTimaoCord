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
    <div className="flex flex-col min-h-screen bg-background text-foreground relative justify-center">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <main className="flex flex-col items-center justify-center text-center p-4 z-10">
        <div className="mb-8">
          <Image
            src="https://i.imgur.com/xD76hcl.png"
            alt="TimãoCord Logo"
            width={500}
            height={127}
            className="h-32 w-auto"
            priority
            data-ai-hint="logo"
          />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-headline tracking-tighter mb-4">
          Bem-vindo ao Timaocord
        </h1>
        <p className="max-w-[600px] text-muted-foreground md:text-xl mb-8">
          Nossa comunidade para os verdadeiros fiéis. Divirta-se em nossa plataforma de apostas com moeda virtual.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" asChild disabled={!guildInviteUrl}>
            <Link href={guildInviteUrl || '#'} target="_blank" rel="noopener noreferrer">
              <DiscordLogo className="mr-2 h-5 w-5" />
              Entrar no Discord
            </Link>
          </Button>
          <LoginButton />
        </div>
      </main>
      <footer className="flex flex-col items-center justify-center p-6 text-muted-foreground z-10">
        <p>© 2025 Timaocord. Todos os direitos reservados.</p>
        <div className="flex gap-4 mt-2 mb-4 text-sm">
            <Link href="/terms" className="hover:text-primary transition-colors">Termos e Condições</Link>
            <span className="text-muted-foreground/50">|</span>
            <Link href="/privacy" className="hover:text-primary transition-colors">Política de Privacidade</Link>
        </div>
        <p className="max-w-lg text-center text-xs text-muted-foreground/70">
            Esta é uma plataforma de apostas fictícias, criada exclusivamente para fins de entretenimento, utilizando apenas moedas virtuais sem valor real.
        </p>
      </footer>
    </div>
  );
}
