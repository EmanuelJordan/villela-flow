'use client'

import { Check, Copy, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { ApresentacaoProposta } from '@/lib/validators/proposta-comercial'
import { BaixarPdfButton } from './baixar-pdf-button'
import type { CondicoesComerciais } from './apresentacao-proposta'

export function PropostaGerada({
  token,
  apresentacao,
  condicoes,
}: {
  token: string
  apresentacao: ApresentacaoProposta
  condicoes: CondicoesComerciais
}) {
  const url = `${window.location.origin}/proposta/${token}`

  async function copiar() {
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado.')
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:#16a34a]/10">
        <Check className="size-6 text-[color:#16a34a]" />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold">Proposta gerada</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Envie o link da apresentação para o cliente — ele abre sem login.
      </p>

      <p className="mt-4 break-all rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs">{url}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={copiar}>
          <Copy className="size-4" /> Copiar link
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" /> Abrir apresentação
          </a>
        </Button>
        <BaixarPdfButton apresentacao={apresentacao} condicoes={condicoes} url={url} />
      </div>

      <Button variant="ghost" className="mt-6" asChild>
        <Link href="/funil">Voltar ao funil</Link>
      </Button>
    </div>
  )
}
