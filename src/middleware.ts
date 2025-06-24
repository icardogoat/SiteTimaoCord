import { withAuth } from "next-auth/middleware"

export default withAuth({
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
    "/admin/:path*",
  ],
}
