
'use server';

import clientPromise from '@/lib/mongodb';
import { getApiSettings } from './settings-actions';
import { getBotConfig } from './bot-config-actions';
import type { NewsArticle } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

export async function sendDiscordNewsNotification(article: NewsArticle) {
    const { newsChannelId } = await getBotConfig();
    const { siteUrl } = await getApiSettings();
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!newsChannelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        console.log('Discord News channel or bot token not configured. Skipping news notification.');
        return;
    }
    
    const articleUrl = siteUrl ? `${siteUrl}/news/${article._id.toString()}` : article.url;

    const embed = {
        color: 0x0ea5e9, // sky-500
        author: {
            name: `${article.author.name} (@${article.author.username})`,
            url: `https://x.com/${article.author.username}`,
            icon_url: article.author.avatarUrl,
        },
        description: article.text,
        image: article.mediaUrl ? { url: article.mediaUrl } : undefined,
        footer: {
            text: `Fonte: X (Twitter)`,
        },
        timestamp: new Date(article.publishedAt).toISOString(),
    };

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bot ${botToken}` },
            body: JSON.stringify({ embeds: [embed] }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send news notification to Discord:', JSON.stringify(errorData, null, 2));
        } else {
            console.log(`Successfully sent news notification for tweet: "${article.tweetId}"`);
        }
    } catch (error) {
        console.error('Error sending news notification to Discord:', error);
    }
}


export async function fetchAndStoreXPosts(options: { manual?: boolean, limit?: number } = {}) {
    console.log('Starting to fetch X posts...');
    const { xApiBearerToken, xUsernames } = await getApiSettings();
    const { manual = false, limit = 10 } = options;

    if (!xApiBearerToken || !xUsernames || xUsernames.length === 0) {
        const msg = 'X API Bearer Token or Usernames not configured. Skipping X fetch.';
        console.log(msg);
        return { success: false, message: msg };
    }

    const client = await clientPromise;
    const db = client.db('timaocord');
    const articlesCollection = db.collection<NewsArticle>('news_articles');
    
    const headers = {
        'Authorization': `Bearer ${xApiBearerToken}`,
        'Content-Type': 'application/json',
    };

    try {
        // 1. Get user IDs from usernames
        const userLookupUrl = `https://api.twitter.com/2/users/by?usernames=${xUsernames.join(',')}&user.fields=profile_image_url`;
        const usersRes = await fetch(userLookupUrl, { headers, cache: 'no-store' });

        if (!usersRes.ok) {
            const error = await usersRes.json();
            throw new Error(`X API User Lookup Error: ${error.detail || usersRes.statusText}`);
        }
        const { data: usersData } = await usersRes.json();
        if (!usersData || usersData.length === 0) {
            throw new Error('No X users found for the provided usernames.');
        }

        let newPostsCount = 0;

        // 2. For each user, get their recent tweets
        for (const user of usersData) {
            const tweetLookupUrl = `https://api.twitter.com/2/users/${user.id}/tweets?max_results=${limit}&exclude=retweets,replies&expansions=attachments.media_keys&tweet.fields=created_at&media.fields=url,preview_image_url`;
            const tweetsRes = await fetch(tweetLookupUrl, { headers, cache: 'no-store' });
            
            if (!tweetsRes.ok) {
                console.error(`Failed to fetch tweets for ${user.username}. Status: ${tweetsRes.status}`);
                continue; // Skip this user and try the next one
            }

            const tweetsPayload = await tweetsRes.json();
            const tweets = tweetsPayload.data || [];
            const media = new Map((tweetsPayload.includes?.media || []).map((m: any) => [m.media_key, m]));

            for (const tweet of tweets) {
                const existingPost = await articlesCollection.findOne({ tweetId: tweet.id });
                if (existingPost) {
                    continue; // Skip if already in DB
                }
                
                let mediaUrl = null;
                if (tweet.attachments?.media_keys?.length > 0) {
                    const mediaData = media.get(tweet.attachments.media_keys[0]);
                    if (mediaData?.type === 'photo') {
                        mediaUrl = mediaData.url;
                    } else if (mediaData?.type === 'video') {
                        mediaUrl = mediaData.preview_image_url;
                    }
                }
                
                // Remove t.co links from the end of the text
                const cleanedText = tweet.text.replace(/https:\/\/t\.co\/\w+$/, '').trim();

                const newPost: Omit<NewsArticle, '_id'> = {
                    tweetId: tweet.id,
                    text: cleanedText,
                    url: `https://x.com/${user.username}/status/${tweet.id}`,
                    author: {
                        name: user.name,
                        username: user.username,
                        avatarUrl: user.profile_image_url.replace('_normal', '_400x400'),
                    },
                    mediaUrl: mediaUrl,
                    source: 'X (Twitter)',
                    publishedAt: new Date(tweet.created_at),
                    fetchedAt: new Date(),
                };

                const result = await articlesCollection.insertOne(newPost as any);
                await sendDiscordNewsNotification({ ...newPost, _id: result.insertedId });
                newPostsCount++;
            }
        }
        
        if (newPostsCount > 0) {
            revalidatePath('/news');
            revalidatePath('/');
        }
        
        const message = manual 
            ? `Busca manual concluída. ${newPostsCount} novo(s) post(s) adicionado(s).`
            : `X posts fetch complete. Added ${newPostsCount} new posts.`;

        console.log(message);
        return { success: true, message };

    } catch (error) {
        const message = `Failed to fetch or store X posts: ${(error as Error).message}`;
        console.error(message, error);
        return { success: false, message };
    }
}

export async function getNews(): Promise<NewsArticle[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const articlesCollection = db.collection<NewsArticle>('news_articles');
        const articles = await articlesCollection.find({}).sort({ publishedAt: -1 }).limit(50).toArray();

        return JSON.parse(JSON.stringify(articles));
    } catch (error) {
        console.error("Error fetching news from DB:", error);
        return [];
    }
}

export async function getNewsArticleById(id: string): Promise<NewsArticle | null> {
    if (!ObjectId.isValid(id)) {
        return null;
    }

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const articlesCollection = db.collection<NewsArticle>('news_articles');
        const article = await articlesCollection.findOne({ _id: new ObjectId(id) });

        if (!article) {
            return null;
        }

        return JSON.parse(JSON.stringify(article));
    } catch (error) {
        console.error(`Error fetching news article by ID ${id}:`, error);
        return null;
    }
}

export async function deleteOldNews() {
    console.log('Starting old news cleanup job...');
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const articlesCollection = db.collection<NewsArticle>('news_articles');

        const result = await articlesCollection.deleteMany({
            publishedAt: { $lt: twoMonthsAgo }
        });

        const message = `Old news cleanup complete. Deleted ${result.deletedCount} articles.`;
        console.log(message);
        return { success: true, message, deletedCount: result.deletedCount };
    } catch (error) {
        const message = `Failed to delete old news: ${(error as Error).message}`;
        console.error(message, error);
        return { success: false, message };
    }
}
