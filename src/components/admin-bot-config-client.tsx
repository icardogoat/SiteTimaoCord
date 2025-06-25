'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { BotConfig } from "@/types";
import { updateBotConfig } from "@/actions/bot-config-actions";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  welcomeChannelId: z.string().optional(),
  logChannelId: z.string().optional(),
  bettingChannelId: z.string().optional(),
  adminRoleId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminBotConfigClientProps {
    initialConfig: Partial<BotConfig>;
}

export default function AdminBotConfigClient({ initialConfig }: AdminBotConfigClientProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            welcomeChannelId: initialConfig.welcomeChannelId || "",
            logChannelId: initialConfig.logChannelId || "",
            bettingChannelId: initialConfig.bettingChannelId || "",
            adminRoleId: initialConfig.adminRoleId || "",
        },
    });

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true);
        const result = await updateBotConfig({
            welcomeChannelId: values.welcomeChannelId || '',
            logChannelId: values.logChannelId || '',
            bettingChannelId: values.bettingChannelId || '',
            adminRoleId: values.adminRoleId || '',
        });

        if (result.success) {
            toast({
                title: "Sucesso!",
                description: result.message,
            });
        } else {
            toast({
                title: "Erro",
                description: result.message,
                variant: "destructive",
            });
        }
        setIsSubmitting(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuração do Bot do Discord</CardTitle>
                <CardDescription>
                    Gerencie as configurações do seu bot do Discord. Insira os IDs dos canais e cargos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="welcomeChannelId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID do Canal de Boas-Vindas</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Insira o ID do canal" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        O canal onde as mensagens de boas-vindas serão enviadas.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="logChannelId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID do Canal de Logs</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Insira o ID do canal" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        O canal para registrar logs de atividades importantes do bot.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="bettingChannelId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID do Canal de Apostas</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Insira o ID do canal" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                       O canal principal onde as apostas são anunciadas ou permitidas.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="adminRoleId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID do Cargo de Administrador</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Insira o ID do cargo" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        O cargo que tem permissão para usar comandos de admin do bot.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Configurações
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
