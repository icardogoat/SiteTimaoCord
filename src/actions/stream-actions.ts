
'use server';

import clientPromise from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import type { LiveStream, LiveStreamPoll, LiveStreamAlert } from '@/types';
import { ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';

// --- Stream Management ---

export async function getLiveStreams(): Promise<LiveStream[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const streams = await db.collection<LiveStream>('streams').find({}).sort({ createdAt: -1 }).toArray();
        return JSON.parse(JSON.stringify(streams));
    } catch (error) {
        console.error("Error fetching live streams:", error);
        return [];
    }
}

export async function getLiveStream(id: string): Promise<LiveStream | null> {
    if (!ObjectId.isValid(id)) return null;
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const stream = await db.collection('streams').findOne({ _id: new ObjectId(id) });
        if (!stream) return null;
        return JSON.parse(JSON.stringify(stream));
    } catch (error) {
        console.error("Error fetching live stream:", error);
        return null;
    }
}

export async function upsertLiveStream(data: {
    id?: string;
    name: string;
    streamType: 'iframe' | 'hls';
    embedCode?: string;
    streamUrl?: string;
}): Promise<{ success: boolean; message: string; streamId?: string }> {
    const { id, ...streamData } = data;
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<LiveStream>('streams');

        if (id) {
            await collection.updateOne({ _id: new ObjectId(id) }, { $set: streamData });
            revalidatePath(`/admin/stream`);
            revalidatePath(`/stream/${id}`);
            return { success: true, message: 'Transmissão atualizada com sucesso!', streamId: id };
        } else {
            const result = await collection.insertOne({
                ...streamData,
                createdAt: new Date(),
                liveAlert: null,
                livePoll: null,
            } as LiveStream);
            revalidatePath('/admin/stream');
            return { success: true, message: 'Transmissão criada com sucesso!', streamId: result.insertedId.toString() };
        }
    } catch (error) {
        console.error("Error upserting live stream:", error);
        return { success: false, message: "Ocorreu um erro ao salvar a transmissão." };
    }
}

export async function deleteLiveStream(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        await db.collection('streams').deleteOne({ _id: new ObjectId(id) });
        revalidatePath('/admin/stream');
        return { success: true, message: 'Transmissão excluída com sucesso.' };
    } catch (error) {
        console.error("Error deleting live stream:", error);
        return { success: false, message: "Ocorreu um erro ao excluir a transmissão." };
    }
}

// --- Live Element Management ---

export async function updateLiveAlert(streamId: string, text: string | null): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<LiveStream>('streams');

        const alertData: LiveStreamAlert | null = text ? {
            text,
            isActive: true,
            updatedAt: new Date(),
        } : null;

        await collection.updateOne({ _id: new ObjectId(streamId) }, { $set: { liveAlert: alertData } });
        
        revalidatePath(`/stream/${streamId}`);
        revalidatePath(`/api/stream/${streamId}/live`);

        return { success: true, message: text ? 'Alerta ativado!' : 'Alerta desativado.' };
    } catch (error) {
        console.error('Error updating live alert:', error);
        return { success: false, message: 'Falha ao atualizar o alerta.' };
    }
}

export async function updateLivePoll(streamId: string, pollData: { question: string; options: string[] } | null): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<LiveStream>('streams');

        const newPoll: LiveStreamPoll | null = pollData ? {
            question: pollData.question,
            options: pollData.options.map(opt => ({ id: randomBytes(4).toString('hex'), text: opt, votes: 0 })),
            isActive: true,
            updatedAt: new Date(),
            voters: [],
        } : null;
        
        await collection.updateOne({ _id: new ObjectId(streamId) }, { $set: { livePoll: newPoll } });
        
        revalidatePath(`/stream/${streamId}`);
        revalidatePath(`/api/stream/${streamId}/live`);
        
        return { success: true, message: pollData ? 'Enquete ativada!' : 'Enquete desativada.' };
    } catch (error) {
        console.error('Error updating live poll:', error);
        return { success: false, message: 'Falha ao atualizar a enquete.' };
    }
}

export async function voteOnPoll(streamId: string, optionId: string, userId: string): Promise<{ success: boolean; message: string }> {
    if (!ObjectId.isValid(streamId)) {
        return { success: false, message: 'ID da transmissão inválido.' };
    }
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<LiveStream>('streams');

        const stream = await collection.findOne({ _id: new ObjectId(streamId) });

        if (!stream || !stream.livePoll || !stream.livePoll.isActive) {
            return { success: false, message: 'A enquete não está ativa.' };
        }
        if (stream.livePoll.voters.includes(userId)) {
            return { success: false, message: 'Você já votou nesta enquete.' };
        }

        const result = await collection.updateOne(
            { "_id": new ObjectId(streamId), "livePoll.options.id": optionId },
            { 
                $inc: { "livePoll.options.$.votes": 1 },
                $push: { "livePoll.voters": userId }
            }
        );

        if (result.modifiedCount > 0) {
            revalidatePath(`/stream/${streamId}`);
            revalidatePath(`/api/stream/${streamId}/live`);
            return { success: true, message: 'Voto computado!' };
        } else {
            return { success: false, message: 'Opção não encontrada ou falha ao votar.' };
        }
    } catch (error) {
        console.error('Error voting on poll:', error);
        return { success: false, message: 'Ocorreu um erro ao registrar seu voto.' };
    }
}
