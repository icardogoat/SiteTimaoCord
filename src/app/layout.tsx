import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import SessionProviderWrapper from '@/components/session-provider-wrapper';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9003';
const siteTitle = 'Timaocord';
const siteDescription = 'Sua comunidade e plataforma de apostas para os verdadeiros fiéis.';
const ogImage = 'https://i.imgur.com/xD76hcl.png';

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  icons: {
    icon: 'https://i.imgur.com/RocHctJ.png',
    shortcut: 'https://i.imgur.com/RocHctJ.png',
    apple: 'https://i.imgur.com/RocHctJ.png',
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: '/',
    siteName: siteTitle,
    images: [
      {
        url: ogImage,
        width: 500,
        height: 127,
        alt: 'Timaocord Logo',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SessionProviderWrapper>
          {children}
          <Toaster />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
