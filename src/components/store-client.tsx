'use client';

import { useState } from 'react';
import type { StoreItem } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { purchaseItem } from '@/actions/store-actions';
import { Loader2 } from 'lucide-react';

interface StoreClientProps {
    initialItems: StoreItem[];
}

export function StoreClient({ initialItems }: StoreClientProps) {
    const { data: session, update: updateSession } = useSession();
    const { toast } = useToast();
    const [isConfirming, setIsConfirming] = useState<StoreItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const userBalance = session?.user?.balance ?? 0;

    const handlePurchase = async () => {
        if (!isConfirming) return;

        setIsSubmitting(true);
        const result = await purchaseItem(isConfirming.id);

        if (result.success) {
            toast({
                title: 'Compra Realizada!',
                description: result.message,
            });
            await updateSession(); // Refresh session data to get new balance
        } else {
            toast({
                title: 'Erro na Compra',
                description: result.message,
                variant: 'destructive',
            });
        }
        
        setIsSubmitting(false);
        setIsConfirming(null);
    }

    return (
        <>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Loja de Itens</h1>
                    <p className="text-muted-foreground">Use seu saldo para comprar itens exclusivos.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {initialItems.map((item) => {
                        const Icon = item.icon;
                        const canAfford = userBalance >= item.price;
                        return (
                            <Card key={item.id} className="flex flex-col">
                                <CardHeader className="flex-row gap-4 items-center">
                                    <div className="bg-primary/10 text-primary p-3 rounded-lg">
                                        <Icon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <CardTitle>{item.name}</CardTitle>
                                        <CardDescription className="font-bold text-primary text-base">
                                            R$ {item.price.toLocaleString('pt-BR')}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                </CardContent>
                                <CardFooter>
                                    <Button 
                                        className="w-full" 
                                        disabled={!canAfford || isSubmitting}
                                        onClick={() => setIsConfirming(item)}
                                    >
                                        {canAfford ? 'Comprar' : 'Saldo Insuficiente'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </div>

            <AlertDialog open={!!isConfirming} onOpenChange={(isOpen) => !isOpen && setIsConfirming(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Compra</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que deseja comprar "{isConfirming?.name}" por R$ {isConfirming?.price.toLocaleString('pt-BR')}? Este valor será deduzido do seu saldo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePurchase} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
