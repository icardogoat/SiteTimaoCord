
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendAnnouncement } from '@/actions/admin-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Users, Crown, User } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }).max(50, 'O título não pode ter mais de 50 caracteres.'),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }).max(200, 'A descrição não pode ter mais de 200 caracteres.'),
  link: z.string().url({ message: "Por favor, insira uma URL válida." }).optional().or(z.literal('')),
  target: z.enum(['all', 'vip', 'normal'], {
    required_error: "Você precisa selecionar um público alvo."
  }),
});

export default function AdminAnnouncementsClient() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            link: '',
            target: 'all',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        const result = await sendAnnouncement({
            title: values.title,
            description: values.description,
            target: values.target,
            link: values.link || undefined
        });
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            form.reset();
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Enviar Comunicado</CardTitle>
                <CardDescription>Envie uma notificação para usuários específicos da plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="target"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Público Alvo</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                                    >
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <Card className="w-full p-4 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                                                <FormControl>
                                                    <RadioGroupItem value="all" id="all-users" className="sr-only" />
                                                </FormControl>
                                                <FormLabel htmlFor="all-users" className="font-normal cursor-pointer flex flex-col items-center justify-center gap-2">
                                                    <Users className="h-6 w-6" />
                                                    <span>Todos</span>
                                                </FormLabel>
                                            </Card>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <Card className="w-full p-4 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                                                <FormControl>
                                                    <RadioGroupItem value="vip" id="vip-users" className="sr-only" />
                                                </FormControl>
                                                <FormLabel htmlFor="vip-users" className="font-normal cursor-pointer flex flex-col items-center justify-center gap-2">
                                                    <Crown className="h-6 w-6 text-vip" />
                                                    <span>Apenas VIPs</span>
                                                </FormLabel>
                                            </Card>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <Card className="w-full p-4 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                                                <FormControl>
                                                    <RadioGroupItem value="normal" id="normal-users" className="sr-only"/>
                                                </FormControl>
                                                 <FormLabel htmlFor="normal-users" className="font-normal cursor-pointer flex flex-col items-center justify-center gap-2">
                                                    <User className="h-6 w-6" />
                                                    <span>Não-VIPs</span>
                                                </FormLabel>
                                            </Card>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl><Input placeholder="Ex: Manutenção Programada" {...field} /></FormControl>
                                    <FormDescription>O título do comunicado. Será prefixado com "📢".</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl><Textarea placeholder="Descreva o comunicado em detalhes..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="link"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Link (Opcional)</FormLabel>
                                    <FormControl><Input placeholder="https://fielbet.com/alguma-pagina" {...field} /></FormControl>
                                    <FormDescription>Para onde a notificação levará o usuário ao clicar. Se vazio, leva para a página de notificações.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Comunicado
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
