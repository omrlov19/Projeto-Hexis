import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <h1
      className={cn(
        'text-3xl font-black tracking-[0.2em] text-[#D4AF37] uppercase drop-shadow-md',
        className
      )}
    >
      HEXIS
    </h1>
  )
}
