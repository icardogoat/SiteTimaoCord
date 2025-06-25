
import NextAuth from 'next-auth';
import type { AuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import type { Notification, Transaction } from '@/types';
import { getUserLevel } from '@/actions/user-actions';
import { getBotConfig } from '@/actions/bot-config-actions';

async function checkUserVipStatus(discordId: string): Promise<boolean> {
    try {
        const config = await getBotConfig();
        if (!config.guildId || !config.vipRoleIds || config.vipRoleIds.length === 0) {
            return false;
        }

        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) return false;

        const response = await fetch(`https://discord.com/api/v10/guilds/${config.guildId}/members/${discordId}`, {
            headers: { 'Authorization': `Bot ${botToken}` },
            cache: 'no-store'
        });

        if (!response.ok) {
            // User might not be in the server, or other API error
            console.warn(`Could not fetch member data for ${discordId} from guild ${config.guildId}. Status: ${response.status}`);
            return false;
        }

        const member = await response.json();
        if (!member.roles) return false;
        
        const userRoleIds = new Set(member.roles);
        
        return config.vipRoleIds.some(vipRoleId => userRoleIds.has(vipRoleId));
    } catch (error) {
        console.error(`Failed to check VIP status for user ${discordId}:`, error);
        return false;
    }
}


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
                isVip: false,
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
          isVip: false,
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
        
        if (dbUser) {
          const isVip = await checkUserVipStatus(userId);
          const updates: { $set: { [key: string]: any } } = { $set: {} };

          if (typeof dbUser.level === 'undefined') {
              updates.$set.level = 1;
              updates.$set.xp = 0;
          }
          // Update VIP status only if it has changed
          if (dbUser.isVip !== isVip) {
              updates.$set.isVip = isVip;
          }

          if (Object.keys(updates.$set).length > 0) {
              await usersCollection.updateOne({ _id: dbUser._id }, updates);
          }
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
    async jwt({ token, user, trigger }) {
      try {
        if (user) {
          token.discordId = user.discordId;
          token.admin = user.admin ?? false;
          token.isVip = user.isVip ?? false;
        }

        const client = await clientPromise;
        const db = client.db("timaocord");
        const usersCollection = db.collection("users");
        
        // On initial sign-in or session update, refresh VIP status
        if (trigger === 'signIn' || trigger === 'update') {
          const isVip = await checkUserVipStatus(token.discordId as string);
          if (token.isVip !== isVip) {
              token.isVip = isVip;
              await usersCollection.updateOne({ discordId: token.discordId as string }, { $set: { isVip } });
          }
        }
        
        const dbUser = await usersCollection.findOne({ discordId: token.discordId as string });
        if (dbUser) {
          token.admin = dbUser.admin ?? false;
          // Ensure token.isVip is correctly sourced from DB if not already set
          if (typeof token.isVip === 'undefined') {
            token.isVip = dbUser.isVip ?? false;
          }
        }
      } catch (error) {
        console.error("Error in JWT callback, returning original token:", error);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.discordId = token.discordId as string;
        session.user.admin = token.admin as boolean;
        session.user.isVip = token.isVip as boolean;
        
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
