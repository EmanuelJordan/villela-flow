import { desconectarGoogle, obterConexaoGoogle } from '@/actions/google'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ conectado?: string; erro?: string }>
}) {
  const { conectado, erro } = await searchParams
  const conexao = await obterConexaoGoogle()

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-2xl font-bold">Configurações</h1>
      {conectado && <p className="text-sm text-green-700">Conta Google conectada com sucesso.</p>}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Conta Google</CardTitle>
          <CardDescription>
            Conecte sua conta para criar eventos no seu Google Agenda com link do Meet automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          {conexao?.status === 'connected' ? (
            <>
              <div className="text-sm">
                <p className="font-medium">{conexao.google_email ?? 'Conta conectada'}</p>
                <Badge variant="secondary" className="mt-1">
                  Conectada
                </Badge>
              </div>
              <form
                action={async () => {
                  'use server'
                  await desconectarGoogle()
                }}
              >
                <Button variant="outline" type="submit">
                  Desconectar
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                {conexao?.status === 'disconnected'
                  ? 'A conexão expirou ou foi revogada. Reconecte para voltar a criar reuniões.'
                  : 'Nenhuma conta conectada.'}
              </div>
              <Button asChild>
                <a href="/api/google/connect">Conectar Google</a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
