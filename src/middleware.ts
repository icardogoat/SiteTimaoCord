export { default } from "next-auth/middleware"

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
