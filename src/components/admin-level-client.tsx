'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateLevelConfig } from '@/actions/level-actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { LevelThreshold } from '@/types';

const formSchema = z.object({
  levels: z.array(z.object({
    level: z.number(),
    name: z.string().min(1, { message: 'O nome é obrigatório.' }),
    xp: z.coerce.number().min(0, { message: 'O XP não pode ser negativo.' }),
  })),
});

export default function AdminLevelClient({ initialLevels }: { initialLevels: LevelThreshold[] }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { levels: initialLevels },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "levels",
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        const result = await updateLevelConfig(values.levels);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const addLevel = () => {
        const lastLevel = fields[fields.length - 1];
        append({
            level: lastLevel.level + 1,
            name: `Nível ${lastLevel.level + 1}`,
            xp: lastLevel.xp + 50000,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Níveis</CardTitle>
                <CardDescription>Defina os nomes e a quantidade de XP necessária para cada nível. O Nível 1 deve sempre começar com 0 XP.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-4 items-end">
                                    <div className="col-span-1">
                                        <FormLabel>Nível</FormLabel>
                                        <Input value={index + 1} disabled />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name={`levels.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-6">
                                                <FormLabel>Nome do Nível</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`levels.${index}.xp`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-4">
                                                <FormLabel>XP Necessário</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} disabled={index === 0} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="col-span-1">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            disabled={fields.length <= 1 || index === 0}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                             <Button type="button" variant="outline" onClick={addLevel}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Nível
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
