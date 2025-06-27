
'use client';

import type { NewsArticle } from '@/types';
import { NewsCard } from './news-card';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';

interface NewsClientProps {
    initialNews: NewsArticle[];
}

export function NewsClient({ initialNews }: NewsClientProps) {
    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Notícias do Timão</h1>
                <p className="text-muted-foreground">Fique por dentro de tudo que acontece com o Corinthians.</p>
            </div>

            {initialNews.length === 0 ? (
                <div className="flex items-center justify-center pt-16">
                    <Card className="w-full max-w-lg text-center">
                        <CardHeader>
                            <CardTitle>Nenhuma notícia encontrada.</CardTitle>
                            <CardDescription>As notícias mais recentes aparecerão aqui assim que forem publicadas.</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {initialNews.map(article => (
                        <NewsCard key={article._id.toString()} article={article} />
                    ))}
                </div>
            )}
        </div>
    );
}
