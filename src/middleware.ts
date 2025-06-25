import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      // Routes that require admin role
      if (req.nextUrl.pathname.startsWith("/admin")) {
        return token?.admin === true
      }
      // For all other matched routes, just require the user to be logged in
      return !!token
    },
  },
  pages: {
    signIn: "/",
  },
})

export const config = {
  matcher: [
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
