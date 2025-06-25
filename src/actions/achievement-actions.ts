'use server';

import clientPromise from '@/lib/mongodb';
import { Award, Badge, Crown, Gem, Heart, Medal, Rocket, Star, Trophy, UserPlus, Zap } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import type { Notification } from '@/types';

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  hidden?: boolean;
};

// All achievements defined here
const allAchievementsList: Achievement[] = [
    { id: 'beginner', name: 'Membro Fundador', description: 'Juntou-se à comunidade FielBet.', icon: UserPlus },
    { id: 'first_bet', name: 'Na Torcida', description: 'Fez sua primeira aposta.', icon: Rocket },
    { id: 'first_win', name: 'Sorte de Principiante', description: 'Ganhou sua primeira aposta.', icon: Trophy },
    { id: 'first_multiple', name: 'Estrategista', description: 'Fez sua primeira aposta múltipla.', icon: Zap },
    { id: 'first_loss', name: 'Faz Parte', description: 'Perdeu sua primeira aposta. Coragem!', icon: Heart },
    { id: 'level_5', name: 'Veterano', description: 'Alcançou o nível 5.', icon: Star },
    { id: 'level_10', name: 'Lenda', description: 'Alcançou o nível 10.', icon: Crown },
    { id: 'bet_10', name: 'Apostador Frequente', description: 'Fez 10 apostas.', icon: Badge },
    { id: 'bet_50', name: 'Apostador Viciado', description: 'Fez 50 apostas.', icon: Medal },
    { id: 'win_10', name: 'Pé Quente', description: 'Ganhou 10 apostas.', icon: Award },
];

export async function getAllAchievements(): Promise<Achievement[]> {
    // Fill up to 50 with placeholders
    const placeholders: Achievement[] = Array.from({ length: 40 }, (_, i) => ({
        id: `placeholder_${i + 1}`,
        name: 'Em Breve',
        description: 'Esta conquista será revelada no futuro.',
        icon: Gem
    }));

    return [...allAchievementsList, ...placeholders];
}

export async function getUserAchievements(userId: string): Promise<string[]> {
    if (!userId) return [];
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ discordId: userId });
        return user?.unlockedAchievements || [];
    } catch (error) {
        console.error('Error fetching user achievements:', error);
        return [];
    }
}

export async function grantAchievement(userId: string, achievementId: string) {
    if (!userId || !achievementId) return;

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ discordId: userId });

        if (user && (!user.unlockedAchievements || !user.unlockedAchievements.includes(achievementId))) {
            const achievement = allAchievementsList.find(a => a.id === achievementId);
            if (!achievement) return; // Don't grant non-existent achievements

            await usersCollection.updateOne(
                { discordId: userId },
                { $addToSet: { unlockedAchievements: achievementId } }
            );

            // Create a notification for the user
            const notificationsCollection = db.collection('notifications');
            const newNotification: Omit<Notification, '_id'> = {
                userId: userId,
                title: '🏆 Conquista Desbloqueada!',
                description: `Você ganhou a conquista: "${achievement.name}".`,
                date: new Date(),
                read: false,
                link: '/profile'
            };
            await notificationsCollection.insertOne(newNotification as any);

            revalidatePath('/profile');
            revalidatePath('/notifications');
        }
    } catch (error) {
        console.error(`Error granting achievement ${achievementId} to user ${userId}:`, error);
    }
}