
import NextAuth from 'next-auth';
import type { AuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import type { Notification, Transaction } from '@/types';
import { getUserLevel } from '@/actions/user-actions';

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise, { databaseName: "timaocord" }),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      profile(profile) {
        if (!profile.discriminator || profile.discriminator === "0") {
            const numericId = BigInt(profile.id);
            const defaultAvatarNumber = Number(numericId % 6n);
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
    async signIn({ user, profile }) {
      if (!profile && !user) return false;
      
      const userId = profile?.id ?? user.id;
      if(!userId) return false;

      try {
        const client = await clientPromise;
        const db = client.db("timaocord");

        const usersCollection = db.collection("users");
        const dbUser = await usersCollection.findOne({ discordId: userId });
        
        // If user exists but doesn't have level data, initialize it.
        // This handles both new users (after adapter creation) and old users.
        if (dbUser && typeof dbUser.level === 'undefined') {
          await usersCollection.updateOne(
            { _id: dbUser._id },
            { $set: { level: 1, xp: 0 } }
          );
        }

        const walletsCollection = db.collection("wallets");
        const existingWallet = await walletsCollection.findOne({ userId: userId });

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
            userId: userId,
            balance: 1000,
            transactions: [initialTransaction]
          });

          const notificationsCollection = db.collection("notifications");
          const welcomeNotification: Omit<Notification, '_id'> = {
              userId: userId,
              title: 'Bem-vindo ao Timaocord!',
              description: 'Você recebeu R$ 1.000,00 de bônus para começar a apostar. Boa sorte!',
              date: new Date(),
              read: false,
              link: '/wallet'
          };
          await notificationsCollection.insertOne(welcomeNotification as any);
        }
      } catch (error) {
        console.error("Failed to create or check wallet/level for user:", error);
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.discordId = user.discordId;
        token.admin = user.admin ?? false;
      }
      
      try {
        const client = await clientPromise;
        const db = client.db("timaocord");
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
          
          const levelData = await getUserLevel(token.discordId as string);
          session.user.level = levelData;

        } catch (error) {
            console.error("Failed to fetch user balance/level for session:", error);
            session.user.balance = 0;
            session.user.level = { level: 1, xp: 0, xpForNextLevel: 100, progress: 0 }; // Default level
        }
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
