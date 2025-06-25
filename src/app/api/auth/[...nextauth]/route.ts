
import NextAuth from 'next-auth';
import type { AuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import type { Notification, Transaction } from '@/types';

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise, { databaseName: "timaocord" }),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      profile(profile) {
        if (!profile.discriminator || profile.discriminator === "0") {
            const defaultAvatarNumber = Math.floor(Math.random() * 6);
            const image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
            return {
                id: profile.id,
                name: profile.global_name || profile.username,
                email: profile.email,
                image: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : image_url,
                discordId: profile.id,
                admin: false,
            };
        }
        
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
          admin: false,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      try {
        const client = await clientPromise;
        const db = client.db("timaocord");
        const walletsCollection = db.collection("wallets");

        const existingWallet = await walletsCollection.findOne({ userId: user.id });

        if (!existingWallet) {
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

          const notificationsCollection = db.collection("notifications");
          const welcomeNotification: Omit<Notification, '_id'> = {
              userId: user.id,
              title: 'Bem-vindo ao Timaocord!',
              description: 'Você recebeu R$ 1.000,00 de bônus para começar a apostar. Boa sorte!',
              date: new Date(),
              read: false,
              link: '/wallet'
          };
          await notificationsCollection.insertOne(welcomeNotification as any);
        }
      } catch (error) {
        console.error("Failed to create or check wallet for user:", error);
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      // On sign-in, `user` object is present and we can seed the token.
      if (user) {
        token.discordId = user.discordId;
        token.admin = user.admin ?? false;
      }
      
      // To keep the admin status updated after manual DB changes,
      // we re-fetch the user from the database when the JWT is processed.
      try {
        const client = await clientPromise;
        const db = client.db("timaocord");
        // The `users` collection is managed by the MongoDB adapter
        const dbUser = await db.collection("users").findOne({ discordId: token.discordId as string });
        if (dbUser) {
          token.admin = dbUser.admin ?? false;
        }
      } catch (error) {
        console.error("Failed to refresh user admin status in JWT:", error);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.discordId = token.discordId as string;
        session.user.admin = token.admin as boolean;
        
        try {
          const client = await clientPromise;
          const db = client.db("timaocord");
          const wallet = await db.collection("wallets").findOne({ userId: token.discordId as string });
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

    