
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  const totalWinnings = 85.00;
  const totalLosses = 45.00;

  return (
    <AppLayout>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
              <h1 className="text-3xl font-bold font-headline tracking-tight">Perfil</h1>
              <p className="text-muted-foreground">Veja suas informações de perfil e estatísticas.</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                    <CardDescription>Suas informações de perfil não podem ser alteradas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src="https://placehold.co/80x80.png" alt="User Avatar" data-ai-hint="user avatar" />
                            <AvatarFallback>BT</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input id="name" defaultValue="Biro-Biro Timao" readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue="biro-biro@timao.cord" readOnly disabled />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Estatísticas de Apostas</CardTitle>
                    <CardDescription>Seu histórico de ganhos e perdas em todo o tempo.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-sm text-muted-foreground">Total Ganho</p>
                        <p className="text-2xl font-bold text-green-400">R$ {totalWinnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-sm text-muted-foreground">Total Perdido</p>
                        <p className="text-2xl font-bold text-red-400">R$ {totalLosses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </CardContent>
            </Card>
          </div>
      </main>
    </AppLayout>
  )
}
