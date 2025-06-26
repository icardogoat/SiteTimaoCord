import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const { pathname } = req.nextUrl;

      // Cron job routes handle their own authorization via bearer token.
      // They are not included in the matcher below.
      if (pathname.startsWith("/api/cron")) {
        return true; 
      }

      // For all other matched routes, a token is required.
      if (!token) {
        return false;
      }

      // Admin routes require the admin flag.
      if (pathname.startsWith("/admin")) {
        return token.admin === true;
      }

      // Authenticated users can access other matched routes.
      return true;
    },
  },
  pages: {
    signIn: "/", // Redirect to home page on auth failure
    error: "/join-server", // Redirect to join server page on certain errors
  },
})

export const config = {
  // Note: Cron routes are not in this matcher. 
  // They are public from the middleware's perspective and handle their own authorization.
  matcher: [
    "/bet",
    "/my-bets",
    "/notifications",
    "/profile",
    "/ranking",
    "/wallet",
    "/store",
    "/standings",
    "/bolao",
    "/mvp",
    "/advertise",
    "/cassino/:path*",
    "/admin/:path*",
    "/join-server",
  ],
}
