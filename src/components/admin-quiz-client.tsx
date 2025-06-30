
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
    createQuiz,
    deleteQuiz,
    getQuizzes,
    updateQuiz
} from '@/actions/quiz-actions';
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
import { Loader2, PlusCircle, Trash2, Edit, HelpCircle } from 'lucide-react';
import type { Quiz, QuizQuestion } from '@/types';
import type { DiscordChannel, DiscordRole } from '@/actions/bot-config-actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const questionSchema = z.object({
  question: z.string().min(1, 'A pergunta não pode estar vazia.'),
  options: z.array(z.string().min(1, 'A opção não pode estar vazia.')).min(2, 'São necessárias pelo menos 2 opções.').max(4, 'Máximo de 4 opções.'),
  answer: z.coerce.number().min(0).max(3),
});

const quizSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  description: z.string().optional(),
  rewardPerQuestion: z.coerce.number().min(1, 'A recompensa deve ser de pelo menos 1.'),
  questionsPerGame: z.coerce.number().int().min(1, "O quiz deve ter pelo menos 1 pergunta por rodada."),
  winnerLimit: z.coerce.number().int().min(0, "O limite de vencedores não pode ser negativo."),
  channelId: z.string().min(1, 'É necessário selecionar um canal.'),
  mentionRoleId: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'É necessária pelo menos uma pergunta.'),
});

export function AdminQuizClient({ initialQuizzes, discordChannels, discordRoles, error }: { initialQuizzes: Quiz[], discordChannels: DiscordChannel[], discordRoles: DiscordRole[], error: string | null }) {
    const { toast } = useToast();
    const [quizzes, setQuizzes] = useState(initialQuizzes);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);

    const form = useForm<z.infer<typeof quizSchema>>({
        resolver: zodResolver(quizSchema),
        defaultValues: { name: '', questions: [{ question: '', options: ['', ''], answer: 0 }] }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions"
    });

    const handleOpenDialog = (quiz: Quiz | null) => {
        setCurrentQuiz(quiz);
        if (quiz) {
            form.reset({
                id: quiz._id.toString(),
                name: quiz.name,
                description: quiz.description,
                rewardPerQuestion: quiz.rewardPerQuestion,
                questionsPerGame: quiz.questionsPerGame,
                winnerLimit: quiz.winnerLimit,
                channelId: quiz.channelId,
                mentionRoleId: quiz.mentionRoleId,
                questions: quiz.questions,
            });
        } else {
            form.reset({
                name: '',
                description: '',
                rewardPerQuestion: 100,
                questionsPerGame: 5,
                winnerLimit: 0,
                channelId: '',
                mentionRoleId: '',
                questions: [{ question: '', options: ['', ''], answer: 0 }],
            });
        }
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof quizSchema>) => {
        setIsSubmitting(true);
        const result = values.id
            ? await updateQuiz(values.id, values)
            : await createQuiz(values);
        
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            setQuizzes(await getQuizzes());
            setIsDialogOpen(false);
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!isDeleteDialogOpen) return;
        setIsSubmitting(true);
        const result = await deleteQuiz(isDeleteDialogOpen);
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            setQuizzes(quizzes.filter(q => q._id.toString() !== isDeleteDialogOpen));
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
        setIsDeleteDialogOpen(null);
    };

    return (
        <>
        <Card>
            <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                <CardTitle>Gerenciar Quizzes</CardTitle>
                <CardDescription>Crie e gerencie os quizzes para o seu bot.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Quiz</Button>
            </div>
            </CardHeader>
            <CardContent>
             {error && (
                <Alert variant="destructive" className="mb-4">
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>Erro de Configuração do Bot</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nome do Quiz</TableHead>
                    <TableHead className="text-center">Perguntas</TableHead>
                    <TableHead className="text-right">Recompensa (por acerto)</TableHead>
                    <TableHead className="text-right w-24">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {quizzes.length > 0 ? quizzes.map(quiz => (
                    <TableRow key={quiz._id.toString()}>
                    <TableCell>
                        <p className="font-medium">{quiz.name}</p>
                        <p className="text-sm text-muted-foreground">{quiz.description}</p>
                    </TableCell>
                    <TableCell className="text-center">{quiz.questions.length}</TableCell>
                    <TableCell className="text-right font-mono">R$ {quiz.rewardPerQuestion.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="icon" className="mr-2" onClick={() => handleOpenDialog(quiz)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(quiz._id.toString())}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">Nenhum quiz encontrado.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>{currentQuiz ? 'Editar Quiz' : 'Novo Quiz'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <ScrollArea className="max-h-[70vh] pr-6 -mr-6">
                    <div className="space-y-4 p-1">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Nome do Quiz</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Descrição (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FormField control={form.control} name="rewardPerQuestion" render={({ field }) => (
                                <FormItem><FormLabel>Recompensa por Acerto (R$)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="channelId" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Canal do Quiz</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={discordChannels.length === 0}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um canal" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    {discordChannels.map(channel => (
                                        <SelectItem key={channel.id} value={channel.id}>#{channel.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="mentionRoleId" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Cargo para Notificar (Opcional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={discordRoles.length === 0}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um cargo" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="">Nenhum</SelectItem>
                                        {discordRoles.map(role => (
                                            <SelectItem key={role.id} value={role.id}>@{role.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="questionsPerGame" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Perguntas por Rodada</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormDescription>Quantas perguntas (aleatórias) serão feitas do total.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="winnerLimit" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Limite de Vencedores Únicos</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormDescription>Quantos usuários diferentes podem ganhar prêmios. Use 0 para ilimitado.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        
                        <h3 className="text-lg font-semibold pt-4 border-t">Perguntas</h3>
                        
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <Card key={field.id} className="p-4 bg-muted/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold">Pergunta {index + 1}</h4>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    <FormField control={form.control} name={`questions.${index}.question`} render={({ field }) => (
                                        <FormItem><FormLabel>Texto da Pergunta</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField
                                        control={form.control}
                                        name={`questions.${index}.answer`}
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Opções (Marque a correta)</FormLabel>
                                            <RadioGroup onValueChange={field.onChange} value={String(field.value)} className="space-y-2">
                                                {form.getValues(`questions.${index}.options`).map((_, optionIndex) => (
                                                <FormField key={`${field.name}-option-${optionIndex}`} control={form.control} name={`questions.${index}.options.${optionIndex}`} render={({ field: optionField }) => (
                                                    <FormItem className="flex items-center gap-2">
                                                    <FormControl>
                                                         <RadioGroupItem value={String(optionIndex)} id={`${field.name}-${optionIndex}`} />
                                                    </FormControl>
                                                    <Input {...optionField} placeholder={`Opção ${optionIndex + 1}`} className="flex-1"/>
                                                    </FormItem>
                                                )}/>
                                                ))}
                                            </RadioGroup>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                </div>
                                </Card>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ question: '', options: ['', ''], answer: 0 })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Pergunta
                        </Button>
                    </div>
                    </ScrollArea>
                    <DialogFooter className="pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Quiz</Button>
                    </DialogFooter>
                </form>
            </Form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!isDeleteDialogOpen} onOpenChange={() => setIsDeleteDialogOpen(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                Tem certeza que deseja excluir este quiz? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
      </>
    )
}
