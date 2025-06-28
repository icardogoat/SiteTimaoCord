
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
    getLiveStreams,
    upsertLiveStream,
    deleteLiveStream,
    updateLiveAlert,
    updateLivePoll,
} from '@/actions/stream-actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
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
import { Loader2, PlusCircle, Trash2, Edit, Tv, ChevronDown, BarChart2, Eye, AlertCircle, Vote } from 'lucide-react';
import type { LiveStream } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const streamFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  streamType: z.enum(['iframe', 'hls']).default('iframe'),
  embedCode: z.string().optional(),
  streamUrl: z.string().optional(),
}).refine(data => {
    if (data.streamType === 'iframe') {
        return !!data.embedCode && data.embedCode.trim().startsWith('<iframe');
    }
    return true;
}, {
    message: 'O código embed deve ser um <iframe> válido.',
    path: ['embedCode'],
}).refine(data => {
    if (data.streamType === 'hls') {
        try {
            new URL(data.streamUrl || '');
            return (data.streamUrl || '').endsWith('.m3u8');
        } catch {
            return false;
        }
    }
    return true;
}, {
    message: 'Por favor, insira uma URL HLS (.m3u8) válida.',
    path: ['streamUrl'],
});

const alertFormSchema = z.object({
  text: z.string().min(1, { message: "O texto do alerta não pode ser vazio."}).max(100, { message: "O texto do alerta é muito longo."}),
});

const pollFormSchema = z.object({
  question: z.string().min(5, { message: "A pergunta é muito curta."}).max(150, { message: "A pergunta é muito longa."}),
  options: z.array(z.object({ text: z.string().min(1, "A opção não pode ser vazia.").max(50, "A opção é muito longa.") })).min(2, "São necessárias pelo menos 2 opções.").max(4, "São permitidas no máximo 4 opções."),
});

function StreamManager({ stream }: { stream: LiveStream }) {
    const { toast } = useToast();
    const [isAlertSubmitting, setIsAlertSubmitting] = useState(false);
    const [isPollSubmitting, setIsPollSubmitting] = useState(false);
    
    const alertForm = useForm<z.infer<typeof alertFormSchema>>({
        resolver: zodResolver(alertFormSchema),
        defaultValues: { text: stream.liveAlert?.text || '' },
    });
    
    const pollForm = useForm<z.infer<typeof pollFormSchema>>({
        resolver: zodResolver(pollFormSchema),
        defaultValues: {
            question: stream.livePoll?.question || '',
            options: stream.livePoll?.options.map(o => ({ text: o.text })) || [{ text: '' }, { text: '' }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: pollForm.control,
        name: "options"
    });

    const onAlertSubmit = async (values: z.infer<typeof alertFormSchema>) => {
        setIsAlertSubmitting(true);
        const result = await updateLiveAlert(stream._id.toString(), values.text);
        toast({ title: result.success ? "Sucesso!" : "Erro", description: result.message, variant: result.success ? "default" : "destructive" });
        setIsAlertSubmitting(false);
    };

    const onPollSubmit = async (values: z.infer<typeof pollFormSchema>) => {
        setIsPollSubmitting(true);
        const result = await updateLivePoll(stream._id.toString(), {
            question: values.question,
            options: values.options.map(o => o.text),
        });
        toast({ title: result.success ? "Sucesso!" : "Erro", description: result.message, variant: result.success ? "default" : "destructive" });
        setIsPollSubmitting(false);
    };

    const handleClearAlert = async () => {
        setIsAlertSubmitting(true);
        const result = await updateLiveAlert(stream._id.toString(), null);
        toast({ title: result.success ? "Sucesso!" : "Erro", description: result.message, variant: result.success ? "default" : "destructive" });
        alertForm.reset({ text: '' });
        setIsAlertSubmitting(false);
    }
    
    const handleClearPoll = async () => {
        setIsPollSubmitting(true);
        const result = await updateLivePoll(stream._id.toString(), null);
        toast({ title: result.success ? "Sucesso!" : "Erro", description: result.message, variant: result.success ? "default" : "destructive" });
        pollForm.reset({ question: '', options: [{ text: '' }, { text: '' }] });
        setIsPollSubmitting(false);
    }

    const totalVotes = stream.livePoll?.options.reduce((acc, opt) => acc + opt.votes, 0) || 0;

    return (
        <CardContent className="space-y-6 pt-6 border-t">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alert Manager */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" />Gerenciar Alerta</CardTitle>
                        <CardDescription>Envie um alerta de texto que aparecerá sobre a transmissão.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...alertForm}>
                            <form onSubmit={alertForm.handleSubmit(onAlertSubmit)} className="space-y-4">
                                <FormField control={alertForm.control} name="text" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Texto do Alerta</FormLabel>
                                        <FormControl><Input {...field} placeholder="Ex: GOL DO TIMÃO!" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={isAlertSubmitting}>
                                        {isAlertSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Enviar Alerta
                                    </Button>
                                     <Button type="button" variant="ghost" onClick={handleClearAlert} disabled={isAlertSubmitting}>
                                        Limpar
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Poll Manager */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Vote className="h-5 w-5" />Gerenciar Enquete</CardTitle>
                        <CardDescription>Crie e controle uma enquete ao vivo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...pollForm}>
                            <form onSubmit={pollForm.handleSubmit(onPollSubmit)} className="space-y-4">
                                <FormField control={pollForm.control} name="question" render={({ field }) => (
                                    <FormItem><FormLabel>Pergunta</FormLabel><FormControl><Input {...field} placeholder="Quem joga melhor?"/></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <div>
                                    <FormLabel>Opções</FormLabel>
                                    <div className="space-y-2 mt-2">
                                    {fields.map((field, index) => (
                                        <FormField key={field.id} control={pollForm.control} name={`options.${index}.text`} render={({ field: renderField }) => (
                                            <FormItem>
                                                <div className="flex items-center gap-2">
                                                <FormControl><Input {...renderField} /></FormControl>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    ))}
                                    </div>
                                     <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ text: "" })} disabled={fields.length >= 4}>Adicionar Opção</Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={isPollSubmitting}>
                                        {isPollSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Ativar Enquete
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={handleClearPoll} disabled={isPollSubmitting}>
                                        Limpar
                                    </Button>
                                </div>
                            </form>
                        </Form>
                        {stream.livePoll && stream.livePoll.isActive && (
                            <div className="mt-4 border-t pt-4">
                                <p className="font-semibold text-sm mb-2">Resultados ao vivo ({totalVotes} votos)</p>
                                <div className="space-y-2">
                                    {stream.livePoll.options.map(opt => {
                                        const percentage = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
                                        return (
                                            <div key={opt.id}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>{opt.text}</span>
                                                    <span>{opt.votes} ({percentage.toFixed(0)}%)</span>
                                                </div>
                                                <Progress value={percentage} />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </CardContent>
    )
}

export function AdminStreamClient({ initialStreams }: { initialStreams: LiveStream[] }) {
  const { toast } = useToast();
  const [streams, setStreams] = useState(initialStreams);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStream, setCurrentStream] = useState<LiveStream | null>(null);
  const [expandedStreamId, setExpandedStreamId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof streamFormSchema>>({
    resolver: zodResolver(streamFormSchema),
    defaultValues: { streamType: 'iframe' }
  });
  
  const streamType = form.watch('streamType');

  const handleOpenDialog = (stream: LiveStream | null) => {
    setCurrentStream(stream);
    form.reset(stream ? { ...stream, id: stream._id.toString() } : { name: '', embedCode: '', streamUrl: '', streamType: 'iframe' });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof streamFormSchema>) => {
    setIsSubmitting(true);
    const result = await upsertLiveStream(values);
    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
      setStreams(await getLiveStreams());
      setIsDialogOpen(false);
    } else {
      toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!isDeleteDialogOpen) return;
    setIsSubmitting(true);
    const result = await deleteLiveStream(isDeleteDialogOpen);
    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
      setStreams(streams.filter((s) => s._id.toString() !== isDeleteDialogOpen));
    } else {
      toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
    setIsDeleteDialogOpen(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedStreamId(prevId => prevId === id ? null : id);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gerenciar Transmissões</CardTitle>
              <CardDescription>Crie e controle transmissões ao vivo para sua comunidade.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Transmissão
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {streams.length > 0 ? streams.map(stream => (
                <Card key={stream._id.toString()} className="overflow-hidden">
                    <div className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className='flex items-center gap-3'>
                            <Tv className="h-6 w-6 text-primary" />
                            <div>
                                <p className="font-semibold">{stream.name}</p>
                                <p className="text-xs text-muted-foreground">Criado em: {new Date(stream.createdAt).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                             <Button variant="outline" size="sm" asChild>
                                <Link href={`/stream/${stream._id.toString()}`} target="_blank">
                                    <Eye className="mr-2 h-4 w-4"/>
                                    Abrir Página Pública
                                </Link>
                            </Button>
                             <Button variant="secondary" size="sm" onClick={() => handleOpenDialog(stream)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(stream._id.toString())}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                            </Button>
                             <Button variant="ghost" size="sm" onClick={() => toggleExpand(stream._id.toString())}>
                                Gerenciar <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", expandedStreamId === stream._id.toString() && "rotate-180")}/>
                            </Button>
                        </div>
                    </div>
                    {expandedStreamId === stream._id.toString() && <StreamManager stream={stream} />}
                </Card>
            )) : (
                <div className="text-center py-12 text-muted-foreground">
                    <Tv className="mx-auto h-12 w-12" />
                    <p className="mt-4">Nenhuma transmissão criada ainda.</p>
                </div>
            )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentStream ? 'Editar Transmissão' : 'Nova Transmissão'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Transmissão</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Corinthians x São Paulo - Ao Vivo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

                <FormField
                  control={form.control}
                  name="streamType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Transmissão</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="iframe" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Código iFrame
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="hls" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              URL HLS (.m3u8)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {streamType === 'iframe' ? (
                  <FormField
                    control={form.control}
                    name="embedCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Embed do Player</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={6} placeholder='<iframe src="..."></iframe>' />
                        </FormControl>
                        <FormDescription>
                            Cole o código completo do iframe fornecido pelo seu serviço de streaming.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                   <FormField
                    control={form.control}
                    name="streamUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL do Stream HLS</FormLabel>
                        <FormControl>
                           <Input {...field} placeholder="https://exemplo.com/stream.m3u8" />
                        </FormControl>
                         <FormDescription>
                            Cole a URL direta para o arquivo .m3u8.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                </Button>
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
              Tem certeza que deseja excluir esta transmissão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
