
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import type { ApiKeyEntry, SiteSettings } from "@/types";
import { updateApiSettings, updateGeneralSiteSettings } from "@/actions/settings-actions";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

const apiFormSchema = z.object({
  siteUrl: z.string().url({ message: "Por favor, insira uma URL válida." }).optional().or(z.literal('')),
  apiKeys: z.array(z.object({ key: z.string().min(1, 'A chave não pode estar vazia.') })),
  newsApiKey: z.string().optional(),
});

const siteSettingsFormSchema = z.object({
    maintenanceMode: z.boolean().default(false),
    maintenanceMessage: z.string().min(10, 'A mensagem deve ter pelo menos 10 caracteres.').max(200, 'A mensagem é muito longa.'),
    maintenanceExpectedReturn: z.string().max(50, 'O texto é muito longo.').optional(),
});

type ApiFormValues = z.infer<typeof apiFormSchema>;
type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

interface AdminSettingsClientProps {
    initialApiSettings: {
        siteUrl?: string;
        apiKeys?: ApiKeyEntry[];
        newsApiKey?: string;
    };
    initialSiteSettings: SiteSettings;
}

export default function AdminSettingsClient({ initialApiSettings, initialSiteSettings }: AdminSettingsClientProps) {
    const { toast } = useToast();
    const [isApiSubmitting, setIsApiSubmitting] = useState(false);
    const [isSiteSettingsSubmitting, setIsSiteSettingsSubmitting] = useState(false);

    const apiForm = useForm<ApiFormValues>({
        resolver: zodResolver(apiFormSchema),
        defaultValues: {
            siteUrl: initialApiSettings.siteUrl || "",
            apiKeys: initialApiSettings.apiKeys?.map(k => ({ key: k.key })) || [{ key: '' }],
            newsApiKey: initialApiSettings.newsApiKey || "",
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: apiForm.control,
        name: "apiKeys"
    });
    
    const siteSettingsForm = useForm<SiteSettingsFormValues>({
        resolver: zodResolver(siteSettingsFormSchema),
        defaultValues: {
            maintenanceMode: initialSiteSettings.maintenanceMode,
            maintenanceMessage: initialSiteSettings.maintenanceMessage,
            maintenanceExpectedReturn: initialSiteSettings.maintenanceExpectedReturn || '',
        }
    });

    async function onApiSubmit(values: ApiFormValues) {
        setIsApiSubmitting(true);
        const result = await updateApiSettings({
            siteUrl: values.siteUrl || '',
            apiKeys: values.apiKeys,
            newsApiKey: values.newsApiKey || '',
        });

        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsApiSubmitting(false);
    }
    
    async function onSiteSettingsSubmit(values: SiteSettingsFormValues) {
        setIsSiteSettingsSubmitting(true);
        const result = await updateGeneralSiteSettings(values);
        
         if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSiteSettingsSubmitting(false);
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manutenção do Site</CardTitle>
                    <CardDescription>
                        Ative o modo de manutenção para bloquear o acesso ao site, exceto para o painel de administração.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...siteSettingsForm}>
                        <form onSubmit={siteSettingsForm.handleSubmit(onSiteSettingsSubmit)} className="space-y-8">
                            <FormField
                                control={siteSettingsForm.control}
                                name="maintenanceMode"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Ativar Modo de Manutenção</FormLabel>
                                            <FormDescription>Quando ativado, apenas administradores podem acessar o site.</FormDescription>
                                        </div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={siteSettingsForm.control}
                                name="maintenanceMessage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mensagem de Manutenção</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Ex: Estamos realizando uma atualização importante..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={siteSettingsForm.control}
                                name="maintenanceExpectedReturn"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Horário Previsto para Retorno (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 14:00h" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <Button type="submit" disabled={isSiteSettingsSubmitting}>
                                {isSiteSettingsSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Configurações Gerais
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Configurações de API</CardTitle>
                    <CardDescription>
                        Gerencie configurações globais do site e chaves de API.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...apiForm}>
                        <form onSubmit={apiForm.handleSubmit(onApiSubmit)} className="space-y-8">
                            <FormField
                                control={apiForm.control}
                                name="siteUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL do Site</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://seudominio.com" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            A URL base do seu site, usada para gerar links em notificações.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className="space-y-4">
                                <FormLabel>Chaves da API-Football</FormLabel>
                                <FormDescription>Adicione múltiplas chaves. O sistema rotacionará automaticamente para evitar o limite de 90 usos diários por chave.</FormDescription>
                                {fields.map((field, index) => {
                                    const currentKeyData = initialApiSettings.apiKeys?.find(k => k.key === apiForm.watch(`apiKeys.${index}.key`));
                                    return (
                                    <FormField
                                        control={apiForm.control}
                                        key={field.id}
                                        name={`apiKeys.${index}.key`}
                                        render={({ field: renderField }) => (
                                            <FormItem>
                                                <div className="flex items-center gap-2">
                                                    <FormControl>
                                                        <Input type="password" placeholder="Sua chave da API-Football" {...renderField} />
                                                    </FormControl>
                                                    <div className="p-2 border rounded-md bg-muted text-muted-foreground text-sm font-mono whitespace-nowrap">
                                                        {currentKeyData?.usage ?? 0} / 90
                                                    </div>
                                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )})}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => append({ key: '' })}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Adicionar Chave
                                </Button>
                            </div>

                            <FormField
                                control={apiForm.control}
                                name="newsApiKey"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Chave da NewsAPI</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Sua chave da NewsAPI" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Chave de API do serviço <a href="https://newsapi.org/" target="_blank" rel="noopener noreferrer" className="underline">NewsAPI</a> para buscar notícias.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <Button type="submit" disabled={isApiSubmitting}>
                                {isApiSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Configurações de API
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

    
