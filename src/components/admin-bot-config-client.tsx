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
import { updateBotConfig, getDiscordServerDetails, type DiscordChannel, type DiscordRole } from "@/actions/bot-config-actions";
import { Loader2, Terminal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";


const formSchema = z.object({
  guildId: z.string().min(1, 'O ID do Servidor é obrigatório.'),
  welcomeChannelId: z.string().optional(),
  logChannelId: z.string().optional(),
  bettingChannelId: z.string().optional(),
  adminRoleId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminBotConfigClientProps {
    initialConfig: Partial<BotConfig>;
    initialChannels: DiscordChannel[];
    initialRoles: DiscordRole[];
}

export default function AdminBotConfigClient({ initialConfig, initialChannels, initialRoles }: AdminBotConfigClientProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [channels, setChannels] = useState<DiscordChannel[]>(initialChannels);
    const [roles, setRoles] = useState<DiscordRole[]>(initialRoles);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            guildId: initialConfig.guildId || "",
            welcomeChannelId: initialConfig.welcomeChannelId || "",
            logChannelId: initialConfig.logChannelId || "",
            bettingChannelId: initialConfig.bettingChannelId || "",
            adminRoleId: initialConfig.adminRoleId || "",
        },
    });

    const guildId = form.watch('guildId');

    const fetchDetails = async (id: string) => {
        if (!id) return;
        setIsLoadingDetails(true);
        setChannels([]);
        setRoles([]);

        // When fetching for a new ID, clear old selections
        form.reset({
            ...form.getValues(),
            guildId: id, // keep the new id
            welcomeChannelId: '',
            logChannelId: '',
            bettingChannelId: '',
            adminRoleId: '',
        });

        const result = await getDiscordServerDetails(id);
        if (result.success && result.data) {
            setChannels(result.data.channels);
            setRoles(result.data.roles);
            if (result.data.channels.length > 0 || result.data.roles.length > 0) {
                 toast({
                    title: 'Sucesso!',
                    description: 'Canais e cargos carregados com sucesso.'
                });
            }
        } else {
            toast({
                title: 'Erro ao carregar',
                description: result.error,
                variant: 'destructive',
            });
        }
        setIsLoadingDetails(false);
    };

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true);
        const result = await updateBotConfig({
            guildId: values.guildId,
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
                    Gerencie as configurações do seu bot do Discord. Insira o ID do servidor para carregar canais e cargos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="guildId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID do Servidor (Guild ID)</FormLabel>
                                    <div className="flex gap-2">
                                        <FormControl>
                                            <Input placeholder="Insira o ID do seu servidor Discord" {...field} />
                                        </FormControl>
                                        <Button 
                                            type="button" 
                                            onClick={() => fetchDetails(guildId)} 
                                            disabled={!guildId || isLoadingDetails}
                                        >
                                            {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Carregar
                                        </Button>
                                    </div>
                                    <FormDescription>
                                        Após inserir o ID, clique em "Carregar" para buscar os canais e cargos.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        {(guildId && !isLoadingDetails && channels.length === 0 && roles.length === 0) && (
                            <Alert>
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Nenhum Canal ou Cargo Encontrado</AlertTitle>
                                <AlertDescription>
                                    Verifique se o ID do servidor está correto, se o bot foi adicionado ao servidor e se ele possui as permissões necessárias para visualizar canais e cargos.
                                </AlertDescription>
                            </Alert>
                        )}

                        <FormField
                            control={form.control}
                            name="welcomeChannelId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Canal de Boas-Vindas</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um canal" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {channels.map(channel => (
                                                <SelectItem key={channel.id} value={channel.id}>
                                                    #{channel.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    <FormLabel>Canal de Logs</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um canal" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {channels.map(channel => (
                                                <SelectItem key={channel.id} value={channel.id}>
                                                    #{channel.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    <FormLabel>Canal de Apostas</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um canal" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {channels.map(channel => (
                                                <SelectItem key={channel.id} value={channel.id}>
                                                    #{channel.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    <FormLabel>Cargo de Administrador</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={roles.length === 0}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um cargo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {roles.map(role => (
                                                <SelectItem key={role.id} value={role.id}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
