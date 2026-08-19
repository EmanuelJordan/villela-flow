import { Skeleton } from '@/components/ui/skeleton'

const COLUNAS_POR_BLOCO = [3, 2, 2]

export default function FunilLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-48" />
        </div>
      </div>
      {COLUNAS_POR_BLOCO.map((colunas, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border p-3">
          <Skeleton className="h-5 w-56" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: colunas }).map((_, j) => (
              <div key={j} className="w-72 shrink-0 space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
