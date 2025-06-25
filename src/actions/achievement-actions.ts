
'use server';

import clientPromise from '@/lib/mongodb';
import {
    AlertCircle, AlertTriangle, Award, Badge, BarChart2, Calendar, Clock, Combine, CornerRightUp, Crown, DollarSign, FileMinus, Flag, Flame, Gift, Goal, Heart, Layers, Medal, MinusCircle, Rocket, Send, Shield, ShieldCheck, Slash, Sparkles, Star, StarHalf, Target, TrendingUp, Trophy, Umbrella, UserPlus, Users2, XCircle, Zap
} from 'lucide-react';
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
    { id: 'win_50', name: 'Campeão Consagrado', description: 'Ganhou 50 apostas.', icon: Trophy },
    { id: 'multiple_win', name: 'Multiplicador', description: 'Ganhou uma aposta múltipla.', icon: Combine },
    { id: 'multiple_win_5', name: 'Combo Perfeito', description: 'Ganhou 5 apostas múltiplas.', icon: Layers },
    { id: 'daily_login_7', name: 'Fiel Presença', description: 'Entrou 7 dias seguidos.', icon: Calendar },
    { id: 'daily_login_30', name: 'Assíduo', description: 'Entrou 30 dias seguidos.', icon: Clock },
    { id: 'lost_streak_5', name: 'Resiliente', description: 'Perdeu 5 apostas seguidas.', icon: Umbrella },
    { id: 'win_streak_5', name: 'Em Alta', description: 'Ganhou 5 apostas seguidas.', icon: Flame },
    { id: 'win_streak_10', name: 'Invicto', description: 'Ganhou 10 apostas seguidas.', icon: ShieldCheck },
    { id: 'streak_breaker', name: 'Fim da Linha', description: 'Interrompeu a sequência de vitórias.', icon: Slash },
    { id: 'friend_invited', name: 'Recrutador', description: 'Convidou um amigo para a plataforma.', icon: Send },
    { id: 'referral_5', name: 'Influência Crescente', description: '5 amigos convidados se registraram.', icon: BarChart2 },
    { id: 'event_participation', name: 'Evento Especial', description: 'Participou de um evento ou campanha.', icon: Gift },
    { id: 'bet_derby', name: 'Clássico é Clássico', description: 'Apostou em um clássico do futebol.', icon: Target },
    { id: 'underdog_win', name: 'Contra Tudo e Todos', description: 'Ganhou apostando no azarão.', icon: TrendingUp },
    { id: 'high_odds_win', name: 'Quase Impossível', description: 'Ganhou uma aposta com odds acima de 5.0.', icon: StarHalf },
    { id: 'low_odds_loss', name: 'Zebraça!', description: 'Perdeu uma aposta com odds abaixo de 1.3.', icon: AlertTriangle },
    { id: 'bet_cancelled', name: 'Sem Jogo', description: 'Aposta foi cancelada.', icon: XCircle },
    { id: 'balance_zero', name: 'Zerado', description: 'Ficou com saldo zerado.', icon: MinusCircle },
    { id: 'balance_1000', name: 'Milionário da Sorte', description: 'Alcançou saldo de R$ 1.000.000.', icon: DollarSign },
    { id: 'bet_on_final', name: 'Decisão', description: 'Apostou em uma final de campeonato.', icon: Flag },
    { id: 'bet_with_friend', name: 'Bolão de Amigos', description: 'Fez uma aposta em grupo.', icon: Users2 },
    { id: 'risk_taker', name: 'Corajoso', description: 'Apostou todo o saldo disponível.', icon: AlertCircle },
    { id: 'safe_bet', name: 'Cauteloso', description: 'Fez uma aposta com odds abaixo de 1.2.', icon: Shield },
    { id: 'goal_bet', name: 'Na Rede', description: 'Fez uma aposta no mercado de gols.', icon: Goal },
    { id: 'corner_bet', name: 'Escanteando', description: 'Fez uma aposta no mercado de escanteios.', icon: CornerRightUp },
    { id: 'card_bet', name: 'Cartão Vermelho', description: 'Fez uma aposta no mercado de cartões.', icon: FileMinus },
    { id: 'custom_badge', name: 'Exclusivo', description: 'Conquista personalizada da comunidade.', icon: Sparkles },
];

export async function getAllAchievements(): Promise<Achievement[]> {
    return allAchievementsList;
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
