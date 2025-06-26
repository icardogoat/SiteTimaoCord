'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { upsertAdvertisement, deleteAdvertisement, getAdminAdvertisements } from '@/actions/admin-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import type { Advertisement } from '@/types';
import Image from 'next/image';

const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  imageUrl: z.string().url({ message: "Por favor, insira uma URL de imagem válida." }),
  linkUrl: z.string().url({ message: "Por favor, insira uma URL de link válida." }),
  status: z.enum(['active', 'inactive']).default('active'),
});

export default function AdminAdsClient({ initialAds }: { initialAds: Advertisement[] }) {
    const { toast } = useToast();
    const [ads, setAds] = useState(initialAds);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);

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
        setIsSubmitting(true);
        const result = await deleteAdvertisement(isDeleteDialogOpen);
         if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setAds(ads.filter(ad => ad._id.toString() !== isDeleteDialogOpen));
            setIsDeleteDialogOpen(null);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Gerenciar Anúncios</CardTitle>
                            <CardDescription>Adicione, edite ou remova anúncios do sistema.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Anúncio</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Anúncio</TableHead>
                                <TableHead>Proprietário</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="w-24">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ads.map(ad => (
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
                                    <TableCell>
                                        <span className={`text-xs ${ad.owner === 'user' ? 'text-blue-400' : 'text-muted-foreground'}`}>
                                            {ad.owner === 'user' ? 'Usuário' : 'Sistema'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`px-2 py-1 text-xs rounded-full ${ad.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            {ad.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(ad)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(ad._id.toString())}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{currentAd ? 'Editar Anúncio' : 'Novo Anúncio'}</DialogTitle>
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
                        <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
