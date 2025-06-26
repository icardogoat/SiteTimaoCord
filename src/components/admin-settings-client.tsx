
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
import type { ApiKeyEntry } from "@/types";
import { updateApiSettings } from "@/actions/settings-actions";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";

const apiKeySchema = z.object({
  key: z.string().min(1, 'A chave não pode estar vazia.'),
});

const formSchema = z.object({
  siteUrl: z.string().url({ message: "Por favor, insira uma URL válida." }).optional().or(z.literal('')),
  apiKeys: z.array(apiKeySchema),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminSettingsClientProps {
    initialSettings: {
        siteUrl?: string;
        apiKeys?: ApiKeyEntry[];
    };
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            siteUrl: initialSettings.siteUrl || "",
            apiKeys: initialSettings.apiKeys?.map(k => ({ key: k.key })) || [{ key: '' }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "apiKeys"
    });

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true);
        const result = await updateApiSettings({
            siteUrl: values.siteUrl || '',
            apiKeys: values.apiKeys,
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
                        
                        <div className="space-y-4">
                            <FormLabel>Chaves da API-Football</FormLabel>
                            <FormDescription>Adicione múltiplas chaves. O sistema rotacionará automaticamente para evitar o limite de 90 usos diários por chave.</FormDescription>
                            {fields.map((field, index) => {
                                const currentKeyData = initialSettings.apiKeys?.find(k => k.key === form.watch(`apiKeys.${index}.key`));
                                return (
                                <FormField
                                    control={form.control}
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
