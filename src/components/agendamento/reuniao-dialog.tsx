'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Check, Copy, ExternalLink, User, Video } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export type ReuniaoInfo = {
  titulo: string
  descricao?: string | null
  inicio: string
  fim: string
  cliente?: string | null
  meetLink?: string | null
}

/** `https://meet.google.com/abc-defg-hij` → `abc-defg-hij` */
export function codigoDoMeet(link: string | null | undefined): string | null {
  const m = link?.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)
  return m ? m[1] : null
}

function periodo(r: ReuniaoInfo) {
  const dia = format(new Date(r.inicio), "EEEE, dd 'de' MMMM", { locale: ptBR })
  const hora = `${format(new Date(r.inicio), 'HH:mm')} às ${format(new Date(r.fim), 'HH:mm')}`
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${hora}`
}

/** Texto pronto para colar no WhatsApp/e-mail do cliente. */
export function mensagemParaCliente(r: ReuniaoInfo): string {
  return [
    `Olá${r.cliente ? `, ${r.cliente}` : ''}! Sua reunião está confirmada.`,
    '',
    r.titulo,
    periodo(r),
    r.meetLink ? `\nLink da videochamada: ${r.meetLink}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n')
}

export function BotaoCopiar({
  texto,
  rotulo,
  rotuloCopiado = 'Copiado!',
  variant = 'outline',
  size = 'sm',
  className,
}: {
  texto: string
  rotulo: string
  rotuloCopiado?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  className?: string
}) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error('Não foi possível copiar — selecione o texto manualmente.')
    }
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={copiar}>
      {copiado ? <Check className="text-emerald-600" /> : <Copy />}
      {copiado ? rotuloCopiado : rotulo}
    </Button>
  )
}

export function ReuniaoDialog({
  reuniao,
  open,
  onOpenChange,
  titulo = 'Reunião agendada',
}: {
  reuniao: ReuniaoInfo | null
  open: boolean
  onOpenChange: (v: boolean) => void
  titulo?: string
}) {
  if (!reuniao) return null
  const codigo = codigoDoMeet(reuniao.meetLink)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="font-medium">{reuniao.titulo}</p>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0" />
              {periodo(reuniao)}
            </p>
            {reuniao.cliente && (
              <p className="flex items-center gap-2">
                <User className="size-4 shrink-0" />
                {reuniao.cliente}
              </p>
            )}
          </div>

          {reuniao.descricao && (
            <p className="whitespace-pre-line rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              {reuniao.descricao}
            </p>
          )}

          {reuniao.meetLink ? (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Video className="size-4" />
                Google Meet
              </p>
              {codigo && (
                <p className="font-mono text-xl font-semibold tracking-wide select-all">{codigo}</p>
              )}
              <p className="text-xs break-all text-muted-foreground select-all">{reuniao.meetLink}</p>
              <div className="flex flex-wrap gap-2">
                <BotaoCopiar texto={reuniao.meetLink} rotulo="Copiar link" />
                {codigo && <BotaoCopiar texto={codigo} rotulo="Copiar código" />}
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={reuniao.meetLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                    Abrir
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Este agendamento não tem link do Meet. Ative &ldquo;Criar no Google Calendar&rdquo; ao agendar
              para gerar um.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Fechar
            </Button>
          </DialogClose>
          <BotaoCopiar
            texto={mensagemParaCliente(reuniao)}
            rotulo="Copiar convite do cliente"
            variant="default"
            size="default"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
