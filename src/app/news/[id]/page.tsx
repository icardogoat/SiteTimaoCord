
'use server';

import { getAvailableLeagues } from "@/actions/bet-actions";
import { getNewsArticleById } from "@/actions/news-actions";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Twitter } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarFallbackText } from "@/components/avatar-fallback-text";
import { Button } from "@/components/ui/button";

// Simple function to linkify URLs in text
function linkify(text: string) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            // Let's hide t.co links since they are not user-friendly
            if (part.startsWith('https://t.co/')) return null;
            return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{part}</a>;
        }
        return part;
    });
}

export default async function NewsArticlePage({ params }: { params: { id: string } }) {
    const [article, availableLeagues] = await Promise.all([
        getNewsArticleById(params.id),
        getAvailableLeagues(),
    ]);
    
    if (!article) {
        notFound();
    }

    const timeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: ptBR });
    const fullDate = format(new Date(article.publishedAt), "PPP 'às' HH:mm", { locale: ptBR });

    const isTweet = !!article.author;
    const media = article.mediaUrl || article.imageUrl;
    const displayText = article.text || article.description || '';
    const displayTitle = isTweet ? '' : article.title;


    return (
        <AppLayout availableLeagues={availableLeagues}>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto">
                    <Link href="/news" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Notícias
                    </Link>

                    <Card>
                        {isTweet && article.author ? (
                            <CardHeader className="flex-row items-center gap-4">
                                 <Avatar className="h-12 w-12">
                                    <AvatarImage src={article.author.avatarUrl} alt={article.author.name} data-ai-hint="author avatar" />
                                    <AvatarFallback><AvatarFallbackText name={article.author.name} /></AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{article.author.name}</p>
                                    <p className="text-sm text-muted-foreground">@{article.author.username}</p>
                                </div>
                            </CardHeader>
                         ) : (
                            <CardHeader>
                                <CardTitle>{displayTitle}</CardTitle>
                                <CardDescription>Fonte: {article.source}</CardDescription>
                            </CardHeader>
                         )}
                        <CardContent className="space-y-4">
                           <p className="text-xl text-foreground/90 whitespace-pre-wrap leading-relaxed">
                               {linkify(displayText)}
                           </p>
                           {media && (
                                <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                                    <Image
                                        src={media}
                                        alt="Mídia do post"
                                        fill
                                        className="object-cover"
                                        data-ai-hint="news media"
                                    />
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground pt-2 border-t border-dashed">
                                {fullDate} • {timeAgo}
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="outline" className="w-full">
                                <Link href={article.url} target="_blank" rel="noopener noreferrer">
                                    <Twitter className="mr-2 h-4 w-4" />
                                     Ver no {article.source === 'X (Twitter)' ? 'X (Twitter)' : 'site original'}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
