
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
    upsertPlayerGame,
    deletePlayerGame,
    getPlayerGames,
    setPlayerGameStatus,
    generatePlayerGameByAI,
} from '@/actions/player-game-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, PlusCircle, Trash2, Edit, HelpCircle, Sparkles, Gamepad2, Play, Pause } from 'lucide-react';
import type { PlayerGuessingGame } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from './ui/badge';
import { Label } from '@/components/ui/label';

const gameFormSchema = z.object({
  id: z.string().optional(),
  playerName: z.string().min(1, "O nome do jogador é obrigatório."),
  prizeAmount: z.coerce.number().min(1, "O prêmio deve ser de pelo menos 1."),
  hints: z.array(z.string().min(1, "A dica não pode estar vazia.")).min(5, "São necessárias pelo menos 5 dicas."),
  nationality: z.string().length(2, "Deve ser um código de país de 2 letras.").min(1, "A nacionalidade é obrigatória."),
});

type FormValues = z.infer<typeof gameFormSchema>;

interface AdminPlayerGameClientProps {
    initialGames: PlayerGuessingGame[];
    error: string | null;
}

export function AdminPlayerGameClient({ initialGames, error }: AdminPlayerGameClientProps) {
    const { toast } = useToast();
    const [games, setGames] = useState(initialGames);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiTheme, setAiTheme] = useState('');
    const [currentGame, setCurrentGame] = useState<PlayerGuessingGame | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(gameFormSchema),
        defaultValues: { playerName: '', prizeAmount: 500, hints: Array(5).fill(''), nationality: '' }
    });

     const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "hints"
    });

    const handleGenerateByAI = async () => {
        if (!aiTheme) {
            toast({ title: 'Erro', description: 'Por favor, insira um tema para a IA.', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generatePlayerGameByAI(aiTheme);
            if (result.success && result.data) {
                form.setValue('playerName', result.data.playerName);
                form.setValue('nationality', result.data.nationality);
                form.setValue('hints', result.data.hints);
                toast({ title: 'Sucesso!', description: 'Dados do jogador gerados pela IA.' });
            } else {
                toast({ title: 'Erro de IA', description: result.message, variant: 'destructive' });
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Erro de IA', description: 'Não foi possível gerar os dados do jogador.', variant: 'destructive' });
        }
        setIsGenerating(false);
    };

    const handleOpenDialog = (game: PlayerGuessingGame | null) => {
        setCurrentGame(game);
        form.reset(game ? {
            id: game._id.toString(),
            playerName: game.playerName,
            prizeAmount: game.prizeAmount,
            hints: game.hints,
            nationality: game.nationality,
        } : { playerName: '', prizeAmount: 500, hints: Array(5).fill(''), nationality: '' });
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true);
        const result = await upsertPlayerGame(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setGames(await getPlayerGames());
            setIsDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!isDeleteDialogOpen) return;
        setIsSubmitting(true);
        const result = await deletePlayerGame(isDeleteDialogOpen);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setGames(games.filter(g => g._id.toString() !== isDeleteDialogOpen));
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
        setIsDeleteDialogOpen(null);
    };
    
    const handleStatusChange = async (id: string, newStatus: 'draft' | 'active') => {
        setIsSubmitting(true);
        const result = await setPlayerGameStatus(id, newStatus);
         if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setGames(await getPlayerGames());
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    }
    
    const getStatusBadge = (status: PlayerGuessingGame['status']) => {
        switch(status) {
            case 'active': return <Badge>Ativo</Badge>;
            case 'finished': return <Badge variant="secondary">Finalizado</Badge>;
            case 'draft': return <Badge variant="outline">Rascunho</Badge>;
        }
    }

    return (
    <>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Jogo: Quem é o Jogador?</CardTitle>
                        <CardDescription>Crie e gerencie os jogos de adivinhação.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Jogo</Button>
                </div>
            </CardHeader>
             <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <HelpCircle className="h-4 w-4" />
                        <AlertTitle>Erro de Configuração</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Jogador</TableHead>
                            <TableHead className="text-center">Prêmio</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {games.length > 0 ? games.map(game => (
                            <TableRow key={game._id.toString()}>
                                <TableCell className="font-medium">{game.playerName}</TableCell>
                                <TableCell className="text-center font-mono">R$ {game.prizeAmount.toFixed(2)}</TableCell>
                                <TableCell className="text-center">{getStatusBadge(game.status)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                     {game.status === 'draft' && (
                                        <Button size="sm" onClick={() => handleStatusChange(game._id.toString(), 'active')} disabled={isSubmitting || !!error}>
                                            <Play className="mr-2 h-4 w-4" /> Iniciar
                                        </Button>
                                    )}
                                     {game.status === 'active' && (
                                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange(game._id.toString(), 'draft')} disabled={isSubmitting}>
                                            <Pause className="mr-2 h-4 w-4" /> Pausar
                                        </Button>
                                    )}
                                    <Button variant="outline" size="icon" onClick={() => handleOpenDialog(game)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(game._id.toString())}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                     <Gamepad2 className="mx-auto h-8 w-8 mb-2" />
                                    Nenhum jogo criado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{currentGame ? 'Editar Jogo' : 'Novo Jogo'}</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-6">
                            <Card className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-yellow-400"/> Gerador com IA</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                        placeholder="Ex: um zagueiro campeão do mundo em 2002"
                                        value={aiTheme}
                                        onChange={(e) => setAiTheme(e.target.value)}
                                        disabled={isGenerating}
                                        className="flex-grow"
                                    />
                                    <Button type="button" onClick={handleGenerateByAI} disabled={isGenerating || !aiTheme}>
                                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Gerar Dados
                                    </Button>
                                </CardContent>
                            </Card>

                            <Separator />

                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="playerName" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Nome do Jogador</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="prizeAmount" render={({ field }) => (
                                    <FormItem><FormLabel>Prêmio (R$)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            
                            <FormField control={form.control} name="nationality" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nacionalidade</FormLabel>
                                    <FormControl><Input {...field} maxLength={2} placeholder="Ex: BR, AR, PT" /></FormControl>
                                    <FormDescription>Código do país de 2 letras (ISO 3166-1 alpha-2).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            
                            <div>
                                <Label>Dicas</Label>
                                <div className="space-y-2 mt-2">
                                    {fields.map((field, index) => (
                                         <FormField key={field.id} control={form.control} name={`hints.${index}`} render={({ field: optionField }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl><Textarea {...optionField} rows={1} placeholder={`Dica ${index + 1}`} /></FormControl>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </FormItem>
                                        )}/>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append('')}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Dica
                                </Button>
                            </div>
                        </div>
                        <DialogFooter className="pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Jogo</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!isDeleteDialogOpen} onOpenChange={() => setIsDeleteDialogOpen(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>Tem certeza que deseja excluir este jogo? Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </>
    );
}
