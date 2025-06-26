'use client';

import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useEffect, useState, useRef } from "react";
import { Gift, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { claimDailyReward } from "@/actions/ad-actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

type AdStep = 'initial' | 'video1' | 'video2' | 'claimable';

export function DailyRewardClient() {
    const { data: session, update: updateSession } = useSession();
    const { toast } = useToast();
    const [isClaimedToday, setIsClaimedToday] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [adStep, setAdStep] = useState<AdStep>('initial');
    const videoRef = useRef<HTMLVideoElement>(null);

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

    // Reset ad step when dialog is closed
    useEffect(() => {
        if (!isDialogOpen) {
            setTimeout(() => setAdStep('initial'), 300); // Reset after dialog close animation
        }
    }, [isDialogOpen]);

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
    
    const handleVideoEnd = () => {
        if (adStep === 'video1') {
            setAdStep('video2');
        } else if (adStep === 'video2') {
            setAdStep('claimable');
        }
    };
    
    // Auto-play video when step changes
    useEffect(() => {
        if ((adStep === 'video1' || adStep === 'video2') && videoRef.current) {
            videoRef.current.play().catch(error => {
                console.error("Video autoplay failed:", error);
                // Handle autoplay block, maybe show a play button
            });
        }
    }, [adStep]);

    const renderDialogContent = () => {
        switch(adStep) {
            case 'initial':
                return (
                    <div className="text-center py-8">
                        <p className="mb-4 text-muted-foreground">Assista dois vídeos curtos para liberar sua recompensa.</p>
                        <Button onClick={() => setAdStep('video1')}>Assistir primeiro anúncio</Button>
                    </div>
                );
            case 'video1':
            case 'video2':
                return (
                    <div className="text-center">
                        <p className="mb-2 text-sm text-muted-foreground">Assistindo anúncio {adStep === 'video1' ? '1' : '2'} de 2...</p>
                        <video 
                            ref={videoRef}
                            key={adStep} // Re-mount video element to load new source
                            width="468" 
                            height="80" 
                            onEnded={handleVideoEnd}
                            controls={false}
                            muted // Autoplay is more likely to work when muted
                            playsInline
                            className="w-full aspect-video bg-black rounded-md"
                        >
                            <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
                            Seu navegador não suporta a tag de vídeo.
                        </video>
                    </div>
                );
            case 'claimable':
                 return (
                    <div className="text-center py-8">
                        <p className="mb-4 text-muted-foreground">Obrigado! Sua recompensa está pronta para ser resgatada.</p>
                        <Button onClick={handleClaim} disabled={isSubmitting} className="w-full">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Resgatar R$ 100,00
                        </Button>
                    </div>
                );
        }
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Recompensa Diária
                </CardTitle>
                <CardDescription>
                    Assista 2 anúncios em vídeo e ganhe R$ 100,00 todos os dias.
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
                                Obrigado por apoiar a plataforma! Siga os passos para resgatar seu prêmio.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            {renderDialogContent()}
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
