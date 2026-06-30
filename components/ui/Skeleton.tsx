import { cn } from '@/lib/utils'

/**
 * Componente base para skeletons (feedback visual de carregamento).
 * Evita layout shift quando usado com o mesmo padding/estrutura da página real.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded bg-slate-800', className)}
      {...props}
    />
  )
}
