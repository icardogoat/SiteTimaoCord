
'use client';

import type { NewsArticle } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { AvatarFallbackText } from './avatar-fallback-text';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

interface NewsCardProps {
    article: NewsArticle;
}

function ClientTime({ date }: { date: string | Date }) {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        setTimeAgo(formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR }));
    }, [date]);

    return <>{timeAgo}</>;
}

// Simple function to linkify URLs in text
function linkify(text: string) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline">{part}</a>;
        }
        return part;
    });
}

export function NewsCard({ article }: NewsCardProps) {
    if (!article) {
        return null;
    }

    const isTweet = !!article.author;
    const media = article.mediaUrl || article.imageUrl;
    const contentText = article.text || article.title || '';

    return (
        <Card className="flex flex-col overflow-hidden h-full group">
            <CardHeader className="flex-row items-center gap-3">
                {isTweet && article.author ? (
                     <>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={article.author.avatarUrl} alt={article.author.name} data-ai-hint="author avatar" />
                            <AvatarFallback><AvatarFallbackText name={article.author.name} /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-semibold truncate">{article.author.name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{article.author.username}</p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-hidden">
                        <p className="font-semibold truncate">{article.source || 'Notícia'}</p>
                    </div>
                )}
                <p className="text-xs text-muted-foreground whitespace-nowrap"><ClientTime date={article.publishedAt} /></p>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <p className="text-foreground/90 whitespace-pre-wrap line-clamp-4">{linkify(contentText)}</p>
                {media && (
                    <div className="aspect-video relative rounded-lg overflow-hidden border">
                         <Image
                            src={media}
                            alt="Mídia do post"
                            fill
                            className="object-cover"
                            data-ai-hint="news media"
                        />
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <Button asChild variant="secondary" className="w-full">
                    <Link href={`/news/${article._id.toString()}`}>
                        Ver Post <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
