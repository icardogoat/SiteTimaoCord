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
import type { ApiSettings } from "@/types";
import { updateApiSettings } from "@/actions/settings-actions";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  apiFootballKey: z.string().optional(),
  siteUrl: z.string().url({ message: "Por favor, insira uma URL válida." }).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminSettingsClientProps {
    initialSettings: Partial<ApiSettings>;
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            apiFootballKey: initialSettings.apiFootballKey || "",
            siteUrl: initialSettings.siteUrl || "",
        },
    });

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true);
        const result = await updateApiSettings({
            apiFootballKey: values.apiFootballKey || '',
            siteUrl: values.siteUrl || '',
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
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                    Gerencie configurações globais do site e chaves de API.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
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
                        <FormField
                            control={form.control}
                            name="apiFootballKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>API-Football Key</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Sua chave da API-Football" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Chave necessária para buscar dados de partidas, odds e resultados.
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
