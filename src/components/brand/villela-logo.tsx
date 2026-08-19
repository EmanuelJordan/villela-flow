import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Logo oficial do Grupo Villela (public/brand/logo-grupo-villela.png, fundo
 * transparente). Todo o app consome este componente — trocar o arquivo lá
 * atualiza login, header e afins de uma vez.
 */
export function VillelaLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-grupo-villela.png"
      alt="Grupo Villela — Gestão Empresarial"
      width={196}
      height={80}
      priority
      className={cn('h-auto w-44', className)}
    />
  )
}
