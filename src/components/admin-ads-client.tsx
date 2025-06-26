
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
    upsertAdvertisement, 
    deleteAdvertisement, 
    getAdminAdvertisements,
    approveAdvertisement,
    rejectAndRefundAdvertisement
} from '@/actions/admin-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';
import type { Advertisement } from '@/types';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from './ui/badge';
import Link from 'next/link';

const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  imageUrl: z.string().url({ message: "Por favor, insira uma URL de imagem válida." }),
  linkUrl: z.string().url({ message: "Por favor, insira uma URL de link válida." }),
  status: z.enum(['active', 'inactive']).default('active'),
});

type RejectionDialogState = {
    open: boolean;
    ad: Advertisement | null;
}

export default function AdminAdsClient({ initialAds }: { initialAds: Advertisement[] }) {
    const { toast } = useToast();
    const [ads, setAds] = useState(initialAds);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);
    const [rejectionDialogState, setRejectionDialogState] = useState<RejectionDialogState>({ open: false, ad: null });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { status: 'active' },
    });
    
    const handleOpenDialog = (ad: Advertisement | null) => {
        setCurrentAd(ad);
        form.reset(ad ? { ...ad, id: ad._id.toString() } : { title: '', description: '', imageUrl: '', linkUrl: '', status: 'active' });
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        const result = await upsertAdvertisement(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setAds(await getAdminAdvertisements());
            setIsDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!isDeleteDialogOpen) return;
        setSubmittingId(isDeleteDialogOpen);
        const result = await deleteAdvertisement(isDeleteDialogOpen);
         if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setAds(ads.filter(ad => ad._id.toString() !== isDeleteDialogOpen));
            setIsDeleteDialogOpen(null);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setSubmittingId(null);
    };
    
    const handleApprove = async (adId: string) => {
        setSubmittingId(adId);
        const result = await approveAdvertisement(adId);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setAds(await getAdminAdvertisements());
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setSubmittingId(null);
    };

    const handleRejectAndRefund = async () => {
        if (!rejectionDialogState.ad) return;
        setSubmittingId(rejectionDialogState.ad._id.toString());
        const result = await rejectAndRefundAdvertisement(rejectionDialogState.ad._id.toString());
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setAds(await getAdminAdvertisements());
            setRejectionDialogState({ open: false, ad: null });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setSubmittingId(null);
    };

    const handleRejectAndDelete = async () => {
        if (!rejectionDialogState.ad) return;
        setSubmittingId(rejectionDialogState.ad._id.toString());
        const result = await deleteAdvertisement(rejectionDialogState.ad._id.toString());
        if (result.success) {
            toast({ title: "Sucesso!", description: "Anúncio rejeitado e excluído." });
            setAds(await getAdminAdvertisements());
            setRejectionDialogState({ open: false, ad: null });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setSubmittingId(null);
    };
    
    const pendingAds = ads.filter(ad => ad.status === 'pending');
    const activeAds = ads.filter(ad => ad.status === 'active');
    const inactiveSystemAds = ads.filter(ad => ad.status === 'inactive');

    return (
        <>
            <Tabs defaultValue="pending">
                <div className="flex justify-between items-center mb-4">
                    <TabsList>
                        <TabsTrigger value="pending">Pendentes <Badge variant="secondary" className="ml-2">{pendingAds.length}</Badge></TabsTrigger>
                        <TabsTrigger value="active">Ativos</TabsTrigger>
                        <TabsTrigger value="inactive">Inativos</TabsTrigger>
                    </TabsList>
                    <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Anúncio</Button>
                </div>

                <TabsContent value="pending">
                    <Card>
                        <CardHeader>
                            <CardTitle>Anúncios Pendentes</CardTitle>
                            <CardDescription>Anúncios enviados por usuários que precisam de aprovação.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Anúncio</TableHead><TableHead>Link</TableHead><TableHead className="w-40 text-center">Ações</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {pendingAds.length > 0 ? pendingAds.map(ad => (
                                        <TableRow key={ad._id as string}>
                                            <TableCell>
                                                <div className="flex items-center gap-4">
                                                    <Image src={ad.imageUrl} alt={ad.title} width={40} height={40} className="rounded-md" data-ai-hint="advertisement banner"/>
                                                    <div>
                                                        <p className="font-medium">{ad.title}</p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-xs">{ad.description}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Link href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">{ad.linkUrl}</Link></TableCell>
                                            <TableCell className="flex gap-2 justify-center">
                                                <Button variant="outline" size="sm" onClick={() => handleApprove(ad._id.toString())} disabled={!!submittingId}>
                                                    {submittingId === ad._id.toString() ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4 mr-1"/>} Aprovar
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => setRejectionDialogState({ open: true, ad })} disabled={!!submittingId}>
                                                    <XCircle className="h-4 w-4 mr-1"/> Rejeitar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground h-24">Nenhum anúncio pendente.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="active">
                    <Card>
                        <CardHeader><CardTitle>Anúncios Ativos</CardTitle><CardDescription>Todos os anúncios que estão sendo exibidos no site.</CardDescription></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Anúncio</TableHead><TableHead>Proprietário</TableHead><TableHead className="w-24">Ações</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {activeAds.length > 0 ? activeAds.map(ad => (
                                        <TableRow key={ad._id as string}>
                                            <TableCell>
                                                <div className="flex items-center gap-4">
                                                    <Image src={ad.imageUrl} alt={ad.title} width={40} height={40} className="rounded-md" data-ai-hint="advertisement banner"/>
                                                    <div>
                                                        <p className="font-medium">{ad.title}</p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-xs">{ad.description}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant={ad.owner === 'user' ? 'outline' : 'secondary'}>{ad.owner === 'user' ? 'Usuário' : 'Sistema'}</Badge></TableCell>
                                            <TableCell className="flex gap-2">
                                                <Button variant="outline" size="icon" onClick={() => handleOpenDialog(ad)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(ad._id.toString())}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground h-24">Nenhum anúncio ativo.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="inactive">
                    <Card>
                        <CardHeader><CardTitle>Anúncios Inativos do Sistema</CardTitle><CardDescription>Anúncios criados por você que não estão ativos.</CardDescription></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Anúncio</TableHead><TableHead>Proprietário</TableHead><TableHead className="w-24">Ações</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {inactiveSystemAds.length > 0 ? inactiveSystemAds.map(ad => (
                                        <TableRow key={ad._id as string}>
                                            <TableCell>
                                                <div className="flex items-center gap-4">
                                                    <Image src={ad.imageUrl} alt={ad.title} width={40} height={40} className="rounded-md" data-ai-hint="advertisement banner"/>
                                                    <div>
                                                        <p className="font-medium">{ad.title}</p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-xs">{ad.description}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant={ad.owner === 'user' ? 'outline' : 'secondary'}>{ad.owner === 'user' ? 'Usuário' : 'Sistema'}</Badge></TableCell>
                                            <TableCell className="flex gap-2">
                                                <Button variant="outline" size="icon" onClick={() => handleOpenDialog(ad)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(ad._id.toString())}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground h-24">Nenhum anúncio inativo do sistema.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>


            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{currentAd ? 'Editar Anúncio' : 'Novo Anúncio do Sistema'}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="imageUrl" render={({ field }) => (
                                <FormItem><FormLabel>URL da Imagem</FormLabel><FormControl><Input {...field} placeholder="https://exemplo.com/imagem.png" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="linkUrl" render={({ field }) => (
                                <FormItem><FormLabel>URL do Link</FormLabel><FormControl><Input {...field} placeholder="https://exemplo.com" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Anúncio Ativo</FormLabel>
                                        <FormDescription>Se o anúncio deve ser exibido no site.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value === 'active'}
                                            onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

             <AlertDialog open={!!isDeleteDialogOpen} onOpenChange={() => setIsDeleteDialogOpen(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este anúncio?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={!!submittingId} className="bg-destructive hover:bg-destructive/90">
                            {submittingId === isDeleteDialogOpen && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={rejectionDialogState.open} onOpenChange={(isOpen) => !isOpen && setRejectionDialogState({ open: false, ad: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rejeitar Anúncio</AlertDialogTitle>
                        <AlertDialogDescription>
                            O que você gostaria de fazer com o anúncio "{rejectionDialogState.ad?.title}"?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center flex-col sm:flex-col sm:space-x-0 gap-2">
                        <Button onClick={handleRejectAndRefund} disabled={!!submittingId} variant="destructive">
                            {submittingId === rejectionDialogState.ad?._id.toString() ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Rejeitar e Reembolsar (R$ 500,00)
                        </Button>
                        <Button onClick={handleRejectAndDelete} disabled={!!submittingId} variant="outline">
                             {submittingId === rejectionDialogState.ad?._id.toString() ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Rejeitar e Excluir (Sem reembolso)
                        </Button>
                        <AlertDialogCancel disabled={!!submittingId}>Cancelar</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
