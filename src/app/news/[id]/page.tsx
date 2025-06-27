
'use server';

import { getAvailableLeagues } from "@/actions/bet-actions";
import { getNewsArticleById } from "@/actions/news-actions";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ExternalLink } from "lucide-react";

export default async function NewsArticlePage({ params }: { params: { id: string } }) {
    const [article, availableLeagues] = await Promise.all([
        getNewsArticleById(params.id),
        getAvailableLeagues(),
    ]);
    
    if (!article) {
        notFound();
    }

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <Link href="/news" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Notícias
                    </Link>

                    <Card>
                        <article className="p-4 sm:p-6 lg:p-8">
                            <header className="mb-6">
                                <p className="text-sm text-muted-foreground mb-2">
                                    {article.source} • {format(new Date(article.publishedAt), "PPP", { locale: ptBR })}
                                </p>
                                <h1 className="text-3xl lg:text-4xl font-bold font-headline tracking-tight text-foreground">
                                    {article.title}
                                </h1>
                            </header>
                            
                            {article.imageUrl && (
                                <div className="relative aspect-video w-full mb-6 rounded-lg overflow-hidden">
                                    <Image
                                        src={article.imageUrl}
                                        alt={article.title}
                                        fill
                                        className="object-cover"
                                        data-ai-hint="news article hero"
                                    />
                                </div>
                            )}

                            <div className="prose prose-invert max-w-none text-foreground/90 text-lg leading-relaxed space-y-4">
                                <p>{article.description}</p>
                            </div>
                            
                            <footer className="mt-8 border-t pt-6">
                                <Button asChild>
                                    <Link href={article.url} target="_blank" rel="noopener noreferrer">
                                        Ler matéria original <ExternalLink className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </footer>
                        </article>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
