
import { getSiteSettings } from '@/actions/admin-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FielBetLogo } from '@/components/icons';
import { HardHat, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function MaintenancePage() {
    const { maintenanceMessage, maintenanceExpectedReturn } = await getSiteSettings();

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
             <Link href="/" className="flex items-center justify-center mb-8">
              <FielBetLogo className="h-8 w-8 text-primary" />
              <span className="ml-3 text-2xl font-bold font-headline text-primary">FielBet</span>
            </Link>
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                        <HardHat className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">Em Manutenção</CardTitle>
                    <CardDescription>
                       {maintenanceMessage}
                    </CardDescription>
                </CardHeader>
                
                {maintenanceExpectedReturn && (
                     <CardContent className="text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Retorno previsto: {maintenanceExpectedReturn}</span>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}

    