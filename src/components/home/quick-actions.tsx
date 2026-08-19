import { ArrowRight, CalendarPlus, FileText } from 'lucide-react'
import Link from 'next/link'

/** Ações rápidas logo abaixo das boas-vindas. */
export function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        href="/agendamento"
        className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-[var(--villela-teal)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <CalendarPlus className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">Agendar reunião</span>
          <span className="block truncate text-sm text-muted-foreground">
            Reunião com link do Meet automático
          </span>
        </span>
        <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>

      <Link
        href="/funil"
        className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-[var(--villela-teal)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <FileText className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">Nova proposta</span>
          <span className="block truncate text-sm text-muted-foreground">
            Escolha um card em Efetivas e monte a proposta
          </span>
        </span>
        <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
