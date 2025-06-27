
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
    getAdminPosts, 
    getAuthors,
    upsertPost,
    deletePost,
    upsertAuthor,
    deleteAuthor,
    getPostForEdit
} from '@/actions/admin-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit, Pin, PinOff } from 'lucide-react';
import type { Post, PostAuthor } from '@/types';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

// Schemas
const authorFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  avatarUrl: z.string().url({ message: "Por favor, insira uma URL de imagem válida." }),
});

const postFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
  imageUrl: z.string().url().optional().or(z.literal('')),
  authorId: z.string({ required_error: "É necessário selecionar um autor." }),
  isPinned: z.boolean().default(false),
});

export default function AdminPostsClient({ initialPosts, initialAuthors }: { initialPosts: Post[], initialAuthors: PostAuthor[] }) {
    const { toast } = useToast();
    const [posts, setPosts] = useState(initialPosts);
    const [authors, setAuthors] = useState(initialAuthors);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dialog states
    const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
    const [isAuthorDialogOpen, setIsAuthorDialogOpen] = useState(false);
    const [isDeletePostOpen, setIsDeletePostOpen] = useState<string | null>(null);
    const [isDeleteAuthorOpen, setIsDeleteAuthorOpen] = useState<PostAuthor | null>(null);

    const postForm = useForm<z.infer<typeof postFormSchema>>({ resolver: zodResolver(postFormSchema) });
    const authorForm = useForm<z.infer<typeof authorFormSchema>>({ resolver: zodResolver(authorFormSchema) });

    // Post Handlers
    const handleOpenPostDialog = async (post: Post | null) => {
        if (post) {
            const fullPost = await getPostForEdit(post._id.toString());
            postForm.reset({ ...fullPost, imageUrl: fullPost?.imageUrl || '' });
        } else {
            postForm.reset({ title: '', content: '', authorId: undefined, isPinned: false, imageUrl: '' });
        }
        setIsPostDialogOpen(true);
    };

    const onPostSubmit = async (values: z.infer<typeof postFormSchema>) => {
        setIsSubmitting(true);
        const result = await upsertPost(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setPosts(await getAdminPosts());
            setIsPostDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDeletePost = async () => {
        if (!isDeletePostOpen) return;
        setIsSubmitting(true);
        const result = await deletePost(isDeletePostOpen);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setPosts(posts.filter(p => p._id.toString() !== isDeletePostOpen));
            setIsDeletePostOpen(null);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    // Author Handlers
    const handleOpenAuthorDialog = (author: PostAuthor | null) => {
        authorForm.reset(author ? { ...author, id: author._id.toString() } : { name: '', avatarUrl: '' });
        setIsAuthorDialogOpen(true);
    };
    
    const onAuthorSubmit = async (values: z.infer<typeof authorFormSchema>) => {
        setIsSubmitting(true);
        const result = await upsertAuthor(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setAuthors(await getAuthors());
            setIsAuthorDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDeleteAuthor = async () => {
        if (!isDeleteAuthorOpen) return;
        setIsSubmitting(true);
        const result = await deleteAuthor(isDeleteAuthorOpen._id.toString());
         if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setAuthors(authors.filter(a => a._id.toString() !== isDeleteAuthorOpen._id.toString()));
            setIsDeleteAuthorOpen(null);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    }
    
    return (
        <>
            <Tabs defaultValue="posts">
                <TabsList className="mb-4">
                    <TabsTrigger value="posts">Gerenciar Posts</TabsTrigger>
                    <TabsTrigger value="authors">Gerenciar Autores</TabsTrigger>
                </TabsList>

                <TabsContent value="posts">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Posts</CardTitle>
                                    <CardDescription>Crie e gerencie as notícias do seu site.</CardDescription>
                                </div>
                                <Button onClick={() => handleOpenPostDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Post</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Autor</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {posts.map(post => (
                                        <TableRow key={post._id.toString()}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {post.isPinned && <Pin className="h-4 w-4 text-primary" />}
                                                    <span className="font-medium">{post.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{post.author?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="icon" onClick={() => handleOpenPostDialog(post)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="icon" onClick={() => setIsDeletePostOpen(post._id.toString())} className="ml-2"><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="authors">
                    <Card>
                        <CardHeader>
                             <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Autores</CardTitle>
                                    <CardDescription>Gerencie os perfis que podem criar posts.</CardDescription>
                                </div>
                                <Button onClick={() => handleOpenAuthorDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Autor</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {authors.map(author => (
                                        <TableRow key={author._id.toString()}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar><AvatarImage src={author.avatarUrl} data-ai-hint="author avatar" /><AvatarFallback>{author.name.charAt(0)}</AvatarFallback></Avatar>
                                                    <span className="font-medium">{author.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="icon" onClick={() => handleOpenAuthorDialog(author)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="icon" onClick={() => setIsDeleteAuthorOpen(author)} className="ml-2"><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Post Dialog */}
            <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
                 <DialogContent className="sm:max-w-2xl">
                    <DialogHeader><DialogTitle>{postForm.getValues('id') ? 'Editar Post' : 'Novo Post'}</DialogTitle></DialogHeader>
                    <Form {...postForm}>
                        <form onSubmit={postForm.handleSubmit(onPostSubmit)} className="space-y-4">
                            <FormField control={postForm.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={postForm.control} name="authorId" render={({ field }) => (
                                <FormItem><FormLabel>Autor</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um autor" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {authors.map(author => (
                                            <SelectItem key={author._id.toString()} value={author._id.toString()}>{author.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                            <FormField control={postForm.control} name="content" render={({ field }) => (
                                <FormItem><FormLabel>Conteúdo</FormLabel><FormControl><Textarea rows={10} {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={postForm.control} name="imageUrl" render={({ field }) => (
                                <FormItem><FormLabel>URL da Imagem (Opcional)</FormLabel><FormControl><Input {...field} placeholder="https://exemplo.com/imagem.png" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={postForm.control} name="isPinned" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5"><FormLabel>Fixar Post</FormLabel><FormDescription>Posts fixados aparecem no topo do feed.</FormDescription></div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsPostDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                 </DialogContent>
            </Dialog>

            {/* Author Dialog */}
            <Dialog open={isAuthorDialogOpen} onOpenChange={setIsAuthorDialogOpen}>
                <DialogContent>
                     <DialogHeader><DialogTitle>{authorForm.getValues('id') ? 'Editar Autor' : 'Novo Autor'}</DialogTitle></DialogHeader>
                     <Form {...authorForm}>
                         <form onSubmit={authorForm.handleSubmit(onAuthorSubmit)} className="space-y-4">
                              <FormField control={authorForm.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome do Autor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={authorForm.control} name="avatarUrl" render={({ field }) => (
                                <FormItem><FormLabel>URL do Avatar</FormLabel><FormControl><Input {...field} placeholder="https://exemplo.com/avatar.png" /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAuthorDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
                            </DialogFooter>
                         </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Alerts */}
             <AlertDialog open={!!isDeletePostOpen} onOpenChange={() => setIsDeletePostOpen(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este post?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePost} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!isDeleteAuthorOpen} onOpenChange={() => setIsDeleteAuthorOpen(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir o autor "{isDeleteAuthorOpen?.name}"?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAuthor} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
