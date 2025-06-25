import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const { pathname } = req.nextUrl;

      // Allow cron job routes if the secret is correct, bypassing the token check.
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
  matcher: [
    "/api/cron/:path*", // Add cron routes to be handled by the middleware
    "/bet",
    "/my-bets",
    "/notifications",
    "/profile",
    "/ranking",
    "/wallet",
    "/store",
    "/standings",
    "/admin/:path*",
  ],
  runtime: "nodejs",
}
