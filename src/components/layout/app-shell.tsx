import Image from 'next/image'
import Link from 'next/link'
import { NavTabs } from './nav-tabs'

export function AppShell({
  children,
  usuario,
  visao,
  mostrarAdmin = false,
}: {
  children: React.ReactNode
  usuario?: React.ReactNode
  /** Seletor de visão (VP/gestor) — franqueado não recebe. */
  visao?: React.ReactNode
  mostrarAdmin?: boolean
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link href="/home" aria-label="Grupo Villela — ir para a Home" className="shrink-0">
            <Image
              src="/brand/logo-grupo-villela.png"
              alt="Grupo Villela"
              width={98}
              height={40}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <NavTabs mostrarAdmin={mostrarAdmin} />
          <div className="ml-auto flex items-center gap-3">
            {visao}
            {usuario}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
