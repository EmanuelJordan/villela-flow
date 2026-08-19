'use client'

import { FileDown } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { ApresentacaoProposta } from '@/lib/validators/proposta-comercial'
import type { CondicoesComerciais } from './apresentacao-proposta'

function nomeArquivo(apresentacao: ApresentacaoProposta | null): string {
  const empresa = apresentacao?.cliente?.empresa ?? ''
  const slug = empresa
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
  return `proposta-${slug || 'villela'}.pdf`
}

export function BaixarPdfButton({
  apresentacao,
  condicoes,
  url,
}: {
  apresentacao: ApresentacaoProposta | null
  condicoes: CondicoesComerciais
  /** URL pública da apresentação impressa no rodapé; default = página atual. */
  url?: string
}) {
  const [gerando, setGerando] = useState(false)

  async function baixar() {
    setGerando(true)
    try {
      // a chunk do @react-pdf (~centenas de KB) só baixa quando alguém clica
      const [{ pdf }, { PropostaPdfDoc }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./proposta-pdf'),
      ])
      const blob = await pdf(
        <PropostaPdfDoc
          apresentacao={apresentacao}
          condicoes={condicoes}
          url={url ?? window.location.href}
        />,
      ).toBlob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = nomeArquivo(apresentacao)
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      toast.error('Não foi possível gerar o PDF. Tente de novo.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <Button type="button" variant="outline" disabled={gerando} onClick={baixar}>
      <FileDown className="size-4" /> {gerando ? 'Gerando PDF…' : 'Baixar PDF resumo'}
    </Button>
  )
}
