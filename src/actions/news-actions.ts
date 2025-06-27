
'use server';

import clientPromise from '@/lib/mongodb';
import { getApiSettings } from './settings-actions';
import { getBotConfig } from './bot-config-actions';
import type { NewsArticle } from '@/types';
import { revalidatePath } from 'next/cache';

const NEWS_API_URL = 'https://newsapi.org/v2/everything';

async function sendDiscordNewsNotification(article: Omit<NewsArticle, '_id' | 'fetchedAt'>) {
    const { newsChannelId } = await getBotConfig();
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!newsChannelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        console.log('Discord News channel or bot token not configured. Skipping news notification.');
        return;
    }

    const embed = {
        color: 0x0ea5e9, // sky-500
        title: article.title,
        url: article.url,
        description: article.description,
        image: article.imageUrl ? { url: article.imageUrl } : undefined,
        footer: {
            text: `Fonte: ${article.source}`,
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
            console.log(`Successfully sent news notification for article: "${article.title}"`);
        }
    } catch (error) {
        console.error('Error sending news notification to Discord:', error);
    }
}


export async function fetchAndStoreNews() {
    console.log('Starting to fetch news...');
    const { newsApiKey } = await getApiSettings();

    if (!newsApiKey) {
        console.log('NewsAPI key not configured. Skipping news fetch.');
        return { success: false, message: 'NewsAPI key not configured.' };
    }

    const client = await clientPromise;
    const db = client.db('timaocord');
    const articlesCollection = db.collection<NewsArticle>('news_articles');
    
    // Fetch articles from the last 2 days to ensure we don't miss anything
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const url = `${NEWS_API_URL}?q=Corinthians&from=${twoDaysAgo.toISOString().split('T')[0]}&sortBy=publishedAt&language=pt&apiKey=${newsApiKey}`;

    try {
        const response = await fetch(url, { cache: 'no-store' });
        const data = await response.json();

        if (data.status !== 'ok') {
            console.error('NewsAPI fetch error:', data.message);
            return { success: false, message: `NewsAPI Error: ${data.message}` };
        }

        let newArticlesCount = 0;
        for (const article of data.articles) {
            // Check if article already exists
            const existingArticle = await articlesCollection.findOne({ url: article.url });
            if (existingArticle) {
                continue; // Skip if already in DB
            }
            
            const newArticle: Omit<NewsArticle, '_id'> = {
                title: article.title,
                description: article.description,
                url: article.url,
                imageUrl: article.urlToImage,
                source: article.source.name,
                publishedAt: new Date(article.publishedAt),
                fetchedAt: new Date(),
            };

            await articlesCollection.insertOne(newArticle as any);
            await sendDiscordNewsNotification(newArticle);
            newArticlesCount++;
        }

        if (newArticlesCount > 0) {
            revalidatePath('/news');
        }

        const message = `News fetch complete. Found ${data.articles.length} total articles, added ${newArticlesCount} new articles.`;
        console.log(message);
        return { success: true, message };

    } catch (error) {
        const message = `Failed to fetch or store news: ${(error as Error).message}`;
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
