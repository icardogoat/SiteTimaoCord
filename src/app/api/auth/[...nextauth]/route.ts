
import NextAuth from 'next-auth';
import type { AuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      profile(profile) {
        let image_url: string;
        if (profile.avatar) {
          const format = profile.avatar.startsWith("a_") ? "gif" : "png"
          image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`
        } else {
          // For users without a custom avatar, Discord generates a default one based on their user ID.
          // https://discord.com/developers/docs/reference#image-formatting
          const defaultAvatarNumber = (BigInt(profile.id) >> 22n) % 6n;
          image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`
        }

        return {
          id: profile.id, // This is used by the adapter to link accounts
          name: profile.username,
          email: profile.email,
          image: image_url,
          discordId: profile.id, // This is my custom field
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.discordId = user.discordId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.discordId = token.discordId as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
