'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ABAS = [
  { href: '/home', rotulo: 'Home' },
  { href: '/agendamento', rotulo: 'Agendamento' },
  { href: '/funil', rotulo: 'Funil' },
]

const ABA_ADMIN = { href: '/administracao', rotulo: 'Administração' }

export function NavTabs({ mostrarAdmin = false }: { mostrarAdmin?: boolean }) {
  const pathname = usePathname()
  const abas = mostrarAdmin ? [...ABAS, ABA_ADMIN] : ABAS
  return (
    <nav className="flex items-center gap-1">
      {abas.map((aba) => {
        const ativa = pathname.startsWith(aba.href)
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={cn(
              'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
              ativa
                ? 'text-foreground after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[2px] after:rounded-full after:bg-[var(--villela-logo)]'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {aba.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
