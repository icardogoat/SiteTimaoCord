import {
  Activity,
  CreditCard,
  DollarSign,
  Users,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function Dashboard() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Apostado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 45.231,89</div>
            <p className="text-xs text-muted-foreground">
              +20.1% do último mês
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Usuários Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">
              +180.1% do último mês
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Apostas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">
              +19% do último mês
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">+R$ 573,43</div>
            <p className="text-xs text-muted-foreground">
              -2% da última hora
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Apostas Recentes</CardTitle>
              <CardDescription>
                As últimas 10 apostas realizadas na plataforma.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Partida
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Status
                  </TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Zico da Fiel</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      zico.fiel@example.com
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    Corinthians vs Palmeiras
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge className="text-xs" variant="secondary">
                      Em Aberto
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">R$ 250.00</TableCell>
                </TableRow>
                 <TableRow>
                  <TableCell>
                    <div className="font-medium">Craque Neto 10</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      neto10@example.com
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    Flamengo vs Vasco
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge className="text-xs" variant="outline">
                      Ganha
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">R$ 150.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Vampeta Monstro</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      vamp@example.com
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    Real Madrid vs Barcelona
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                      <Badge className="text-xs" variant="destructive">
                      Perdida
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">R$ 350.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Ronaldo Fenômeno</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      r9@example.com
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    Man. City vs Liverpool
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge className="text-xs" variant="secondary">
                      Em Aberto
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">R$ 450.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Cássio Gigante</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      cassio12@example.com
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    Bayern vs Dortmund
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge className="text-xs" variant="outline">
                      Ganha
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">R$ 550.00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Apostadores</CardTitle>
            <CardDescription>
              Usuários com maior volume de apostas no mês.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8">
            <div className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                <AvatarImage src="https://placehold.co/40x40.png" alt="Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>CG</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  Cássio Gigante
                </p>
                <p className="text-sm text-muted-foreground">
                  cassio12@example.com
                </p>
              </div>
              <div className="ml-auto font-medium">R$ 5.500,20</div>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                <AvatarImage src="https://placehold.co/40x40.png" alt="Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  Craque Neto 10
                </p>
                <p className="text-sm text-muted-foreground">
                  neto10@example.com
                </p>
              </div>
              <div className="ml-auto font-medium">R$ 3.450,00</div>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                <AvatarImage src="https://placehold.co/40x40.png" alt="Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>VM</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  Vampeta Monstro
                </p>
                <p className="text-sm text-muted-foreground">
                  vamp@example.com
                </p>
              </div>
              <div className="ml-auto font-medium">R$ 2.100,50</div>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                <AvatarImage src="https://placehold.co/40x40.png" alt="Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>ZF</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  Zico da Fiel
                </p>
                <p className="text-sm text-muted-foreground">
                  zico.fiel@example.com
                </p>
              </div>
              <div className="ml-auto font-medium">R$ 1.250,75</div>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                <AvatarImage src="https://placehold.co/40x40.png" alt="Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>R9</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  Ronaldo Fenômeno
                </p>
                <p className="text-sm text-muted-foreground">
                  r9@example.com
                </p>
              </div>
              <div className="ml-auto font-medium">R$ 890,00</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
