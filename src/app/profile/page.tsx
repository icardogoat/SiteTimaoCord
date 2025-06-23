import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  return (
    <AppLayout>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
              <h1 className="text-3xl font-bold font-headline tracking-tight">Perfil</h1>
              <p className="text-muted-foreground">Gerencie suas informações de perfil.</p>
          </div>
          <Card className="max-w-2xl mx-auto">
              <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>Atualize seu nome e veja seu email.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                          <AvatarImage src="https://placehold.co/80x80.png" alt="User Avatar" data-ai-hint="user avatar" />
                          <AvatarFallback>BT</AvatarFallback>
                      </Avatar>
                      <Button variant="outline">Alterar Foto</Button>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input id="name" defaultValue="Biro-Biro Timao" />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="biro-biro@timao.cord" readOnly disabled />
                  </div>
                  <Button>Salvar Alterações</Button>
              </CardContent>
          </Card>
      </main>
    </AppLayout>
  )
}
