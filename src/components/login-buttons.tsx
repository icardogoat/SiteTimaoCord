
'use client';

import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { DiscordLogo } from '@/components/icons';
import { useSearchParams } from 'next/navigation';

export function LoginButtons() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/bet';

  return (
    <Button
      className="w-full"
      size="lg"
      onClick={() => signIn('discord', { callbackUrl })}
      disabled={status === 'loading'}
    >
      {status === 'loading' ? (
        'Carregando...'
      ) : (
        <>
          <DiscordLogo className="mr-2 h-5 w-5" />
          Entrar com Discord
        </>
      )}
    </Button>
  );
}
