import { Skeleton } from '@/components/ui/skeleton'

export default function AgendamentoLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-[28rem] w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}
