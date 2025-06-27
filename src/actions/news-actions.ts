
'use server';

import clientPromise from '@/lib/mongodb';
import { getApiSettings } from './settings-actions';
import { getBotConfig } from './bot-config-actions';
import type { Post, PostAuthor } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

export async function sendDiscordPostNotification(post: Post, author: PostAuthor) {
    const { newsChannelId, newsMentionRoleId } = await getBotConfig();
    const { siteUrl } = await getApiSettings();
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!newsChannelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        console.log('Discord News channel or bot token not configured. Skipping post notification.');
        return;
    }
    
    const postUrl = siteUrl ? `${siteUrl}/feed/${post._id.toString()}` : undefined;

    const embed = {
        color: 0x0ea5e9, // sky-500
        author: {
            name: author.name,
            icon_url: author.avatarUrl,
        },
        title: post.title,
        url: postUrl,
        description: post.content.substring(0, 2048), // Truncate content for Discord embed limit
        image: post.imageUrl ? { url: post.imageUrl } : undefined,
        timestamp: new Date(post.publishedAt).toISOString(),
    };

    const payload: { content?: string, embeds: any[], components?: any[] } = {
        embeds: [embed],
    };

    if (newsMentionRoleId) {
        payload.content = `<@&${newsMentionRoleId}>`;
    }

    if (postUrl) {
         payload.components = [
            {
                type: 1, // Action Row
                components: [
                    {
                        type: 2, // Button
                        style: 5, // Link
                        label: 'Ler post completo',
                        url: postUrl
                    }
                ]
            }
        ];
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bot ${botToken}` },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send post notification to Discord:', JSON.stringify(errorData, null, 2));
        } else {
            console.log(`Successfully sent notification for post: "${post.title}"`);
        }
    } catch (error) {
        console.error('Error sending post notification to Discord:', error);
    }
}


export async function getPublicPosts(): Promise<Post[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const postsCollection = db.collection<Post>('posts');
        const posts = await postsCollection.aggregate([
            { $sort: { isPinned: -1, publishedAt: -1 } },
            { $limit: 20 },
            {
                $lookup: {
                    from: 'authors',
                    let: { authorId: { $toObjectId: "$authorId" } },
                    pipeline: [
                        { $match: { $expr: { $eq: [ "$_id", "$$authorId" ] } } }
                    ],
                    as: 'authorDetails'
                }
            },
            {
                $unwind: {
                    path: '$authorDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    content: { $substrCP: ["$content", 0, 150] }, // Truncate content for card view
                    imageUrl: 1,
                    isPinned: 1,
                    publishedAt: 1,
                    author: '$authorDetails'
                }
            }
        ]).toArray();

        return JSON.parse(JSON.stringify(posts));
    } catch (error) {
        console.error("Error fetching public posts from DB:", error);
        return [];
    }
}

export async function getPostById(id: string): Promise<Post | null> {
    if (!ObjectId.isValid(id)) {
        return null;
    }

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const postsCollection = db.collection<Post>('posts');
        
        const postResult = await postsCollection.aggregate([
             { $match: { _id: new ObjectId(id) } },
             {
                $lookup: {
                    from: 'authors',
                    let: { authorId: { $toObjectId: "$authorId" } },
                     pipeline: [
                        { $match: { $expr: { $eq: [ "$_id", "$$authorId" ] } } }
                    ],
                    as: 'authorDetails'
                }
            },
             {
                $unwind: {
                    path: '$authorDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    content: 1,
                    imageUrl: 1,
                    isPinned: 1,
                    publishedAt: 1,
                    author: '$authorDetails'
                }
            }
        ]).toArray();
        
        const post = postResult[0];

        if (!post) {
            return null;
        }

        return JSON.parse(JSON.stringify(post));
    } catch (error) {
        console.error(`Error fetching post by ID ${id}:`, error);
        return null;
    }
}
