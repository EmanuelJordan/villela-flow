import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Botão de envio das telas de auth — navy institucional, largura total. */
export function AuthSubmitButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="submit"
      className={cn(
        'h-12 w-full bg-[var(--villela-navy)] text-[0.95rem] font-semibold text-white hover:bg-[#0d2f43]',
        className,
      )}
      {...props}
    />
  )
}
