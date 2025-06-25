import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const { pathname } = req.nextUrl;

      // This check is now redundant for cron jobs as they are no longer in the matcher,
      // but it's safe to keep. The route handlers perform the actual authorization.
      if (pathname.startsWith("/api/cron")) {
        const authHeader = req.headers.get('authorization');
        return authHeader === `Bearer ${process.env.CRON_SECRET}`;
      }

      // For all other routes in the matcher, a token is required.
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
  },
})

export const config = {
  // Cron routes were removed from this matcher.
  // They are now public from the middleware's perspective and handle their own authorization.
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
    "/admin/:path*",
  ],
  runtime: "nodejs",
}
