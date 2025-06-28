
'use server';

import clientPromise from '@/lib/mongodb';
import { getApiSettings } from './settings-actions';
import { getBotConfig } from './bot-config-actions';
import type { Post, AuthorInfo } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

export async function sendDiscordPostNotification(post: Post, author: AuthorInfo) {
    const { newsChannelId, newsMentionRoleId } = await getBotConfig();
    const { siteUrl } = await getApiSettings();
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!newsChannelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        console.log('Discord News channel or bot token not configured. Skipping post notification.');
        return;
    }

    const postUrl = siteUrl ? `${siteUrl}/news/${post._id.toString()}` : undefined;

    const publishedDate = new Date(post.publishedAt).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Sao_Paulo'
    });

    const header = `# 📢 ${post.title}\n\n`;
    const footer = `\n\n---\n📰 *Publicado por: ${author.name}*\n📅 *${publishedDate}*`;
    
    // Discord message content limit is 2000 characters.
    const mention = newsMentionRoleId ? `<@&${newsMentionRoleId}>` : '';
    const maxContentLength = 2000 - header.length - footer.length - mention.length - 2; // -2 for newlines
    
    const truncatedContent = post.content.length > maxContentLength
        ? post.content.substring(0, maxContentLength - 3) + '...'
        : post.content;
    
    const messageContent = `${header}${truncatedContent}${footer}`;
    
    const imageEmbed = post.imageUrl ? [{
        url: postUrl, // Link the image to the post
        image: {
            url: post.imageUrl
        }
    }] : [];

    const components = postUrl ? [{
        type: 1, // Action Row
        components: [{
            type: 2, // Button
            style: 5, // Link
            label: 'Ler post completo',
            url: postUrl
        }]
    }] : [];

    const finalPayload = {
        content: `${messageContent}\n${mention}`,
        embeds: imageEmbed,
        components: components,
        allowed_mentions: {
            parse: ['roles']
        }
    };

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bot ${botToken}` },
            body: JSON.stringify(finalPayload),
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
                    from: 'users',
                    localField: 'authorId',
                    foreignField: 'discordId',
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
                    author: {
                        name: '$authorDetails.name',
                        avatarUrl: '$authorDetails.image'
                    }
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
                    from: 'users',
                    localField: 'authorId',
                    foreignField: 'discordId',
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
                    author: {
                       name: '$authorDetails.name',
                       avatarUrl: '$authorDetails.image'
                    }
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
