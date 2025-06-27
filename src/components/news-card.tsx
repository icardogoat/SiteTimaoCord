
'use client';

import type { NewsArticle } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';

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


export function NewsCard({ article }: NewsCardProps) {
    return (
        <Card className="flex flex-col overflow-hidden h-full group">
            <Link href={article.url} target="_blank" rel="noopener noreferrer" className="flex flex-col h-full">
                {article.imageUrl && (
                    <CardHeader className="p-0">
                        <div className="aspect-video relative overflow-hidden">
                            <Image
                                src={article.imageUrl}
                                alt={article.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                data-ai-hint="news article"
                            />
                        </div>
                    </CardHeader>
                )}
                <CardContent className="p-4 flex-grow">
                    <CardTitle className="text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
                        {article.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                        {article.description}
                    </CardDescription>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">
                        {article.source} • <ClientTime date={article.publishedAt} />
                    </p>
                </CardFooter>
            </Link>
        </Card>
    );
}
