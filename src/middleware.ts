
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const publicPaths = ['/login', '/join-server', '/maintenance', '/terms', '/privacy', '/'];

  // Evita verificações em rotas de API e arquivos estáticos para não causar loops
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // --- Verificação de Modo de Manutenção ---
  try {
    // Middleware runs on the Edge and cannot access the database directly.
    // So we fetch the status from a dedicated API route.
    const maintenanceStatusRes = await fetch(new URL('/api/maintenance', req.url));
    const { maintenanceMode } = await maintenanceStatusRes.json();

    if (maintenanceMode) {
      // Permite acesso ao painel de administração e à página de login para que o admin possa desativar o modo
      if (pathname.startsWith('/admin') || pathname === '/login') {
         // Continua para a verificação de autenticação abaixo
      } 
      // Permite acesso à própria página de manutenção
      else if (pathname === '/maintenance') {
        return NextResponse.next();
      } 
      // Redireciona todos os outros para a página de manutenção
      else {
        return NextResponse.redirect(new URL('/maintenance', req.url));
      }
    } else {
      // Se o modo de manutenção não estiver ativo, redireciona o usuário para fora da página de manutenção
      if (pathname === '/maintenance') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
  } catch (error) {
    console.error("Middleware maintenance check failed, allowing access to avoid lockout:", error);
    // Em caso de erro na verificação, permite o acesso para não bloquear o site inteiro.
  }

  // --- Verificação de Autenticação e Autorização ---
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isPublicPage = publicPaths.includes(pathname);

  // Se o usuário não está autenticado e a página não é pública, redireciona para o login
  if (!token && !isPublicPage) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se o usuário está autenticado
  if (token) {
    // Redireciona para fora das páginas de autenticação se já estiver logado
    if (pathname === '/login' || pathname === '/join-server') {
        return NextResponse.redirect(new URL('/bet', req.url));
    }
    // Protege as rotas de admin
    if (pathname.startsWith('/admin') && !token.admin) {
        // Redireciona usuários não-admin para fora do painel
        return NextResponse.redirect(new URL('/bet', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes are checked inside the middleware to prevent loops)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
