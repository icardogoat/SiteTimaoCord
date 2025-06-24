
import NextAuth from 'next-auth';
import type { AuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import type { Transaction } from '@/types';

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise, { databaseName: "timaocord" }),
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
          const defaultAvatarNumber = parseInt(profile.discriminator) % 5;
          image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`
        }

        return {
          id: profile.id,
          name: profile.username,
          email: profile.email,
          image: image_url,
          discordId: profile.id,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, isNewUser }) {
      if (isNewUser) {
        try {
          const client = await clientPromise;
          const db = client.db("timaocord");
          const walletsCollection = db.collection("wallets");

          const initialTransaction: Transaction = {
            id: new Date().getTime().toString(),
            type: 'Bônus',
            description: 'Bônus de boas-vindas!',
            amount: 1000,
            date: new Date().toISOString(),
            status: 'Concluído'
          };
          
          await walletsCollection.insertOne({
            userId: user.id,
            balance: 1000,
            transactions: [initialTransaction]
          });
        } catch (error) {
          console.error("Failed to create wallet for new user:", error);
          return false;
        }
      }
      return true;
    },
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
        
        try {
          const client = await clientPromise;
          const db = client.db("timaocord");
          const wallet = await db.collection("wallets").findOne({ userId: token.sub! });
          session.user.balance = wallet ? wallet.balance : 0;
        } catch (error) {
            console.error("Failed to fetch user balance for session:", error);
            session.user.balance = 0;
        }
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
