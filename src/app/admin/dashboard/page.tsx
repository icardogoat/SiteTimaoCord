import {
  DollarSign,
  Users,
  CreditCard,
  Activity,
} from "lucide-react"

import {
  Badge
} from "@/components/ui/badge"
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
      </div>
    </>
  )
}
