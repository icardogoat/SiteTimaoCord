
'use client';

import type { Post } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { AvatarFallbackText } from './avatar-fallback-text';
import { Button } from './ui/button';
import { ArrowRight, Pin } from 'lucide-react';

interface PostCardProps {
    post: Post;
}

function ClientTime({ date }: { date: string | Date }) {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        setTimeAgo(formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR }));
    }, [date]);

    return <>{timeAgo}</>;
}

export function PostCard({ post }: PostCardProps) {
    if (!post || !post.author) {
        return null;
    }

    return (
        <Card className="flex flex-col overflow-hidden h-full group">
             <Link href={`/feed/${post._id.toString()}`} className="flex flex-col h-full">
                {post.imageUrl && (
                    <div className="overflow-hidden relative">
                         <Image
                            src={post.imageUrl}
                            alt={post.title}
                            width={400}
                            height={200}
                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                            data-ai-hint="post image"
                        />
                    </div>
                )}
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={post.author.avatarUrl} alt={post.author.name} data-ai-hint="author avatar" />
                            <AvatarFallback><AvatarFallbackText name={post.author.name} /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-semibold truncate">{post.author.name}</p>
                            <p className="text-xs text-muted-foreground"><ClientTime date={post.publishedAt} /></p>
                        </div>
                        {post.isPinned && <Pin className="h-4 w-4 text-primary" />}
                    </div>
                    <CardTitle className="!mt-2">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-muted-foreground line-clamp-3">{post.content}</p>
                </CardContent>
                <CardFooter>
                    <Button variant="secondary" className="w-full">
                        Ler Mais <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Link>
        </Card>
    );
}
