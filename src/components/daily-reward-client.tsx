'use client';

import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { claimDailyReward } from "@/actions/ad-actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import Image from "next/image";

export function DailyRewardClient() {
    const { data: session, update: updateSession } = useSession();
    const { toast } = useToast();
    const [isClaimedToday, setIsClaimedToday] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        if (session?.user?.dailyRewardLastClaimed) {
            const lastClaimedDate = new Date(session.user.dailyRewardLastClaimed);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            setIsClaimedToday(lastClaimedDate >= today);
        } else if (session) {
            setIsClaimedToday(false);
        }
    }, [session]);

    const handleClaim = async () => {
        setIsSubmitting(true);
        const result = await claimDailyReward();
        if (result.success) {
            toast({
                title: 'Recompensa Resgatada!',
                description: result.message,
            });
            await updateSession(); // Refresh session data
            setIsDialogOpen(false);
        } else {
            toast({
                title: 'Erro',
                description: result.message,
                variant: 'destructive',
            });
        }
        setIsSubmitting(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Recompensa Diária
                </CardTitle>
                <CardDescription>
                    Assista 2 anúncios e ganhe R$ 100,00 todos os dias.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                         <Button className="w-full" disabled={isClaimedToday}>
                            {isClaimedToday ? 'Recompensa já resgatada hoje' : 'Obter Recompensa'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Sua Recompensa Diária</DialogTitle>
                            <DialogDescription>
                                Obrigado por apoiar a plataforma! Clique abaixo para resgatar seu prêmio.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                            <Image src="https://placehold.co/468x60.png" width={468} height={60} alt="Advertisement" data-ai-hint="advertisement banner"/>
                            <Image src="https://placehold.co/468x60.png" width={468} height={60} alt="Advertisement" data-ai-hint="advertisement banner"/>
                             <Button onClick={handleClaim} disabled={isSubmitting} className="w-full mt-4">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Resgatar R$ 100,00
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
