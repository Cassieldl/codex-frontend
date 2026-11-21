import { cn } from '../../lib/cn'

export interface SkeletonProps {
  className?: string
}

/** Placeholder de carregamento - decorativo, o `aria-live` de "Carregando" fica no container pai. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[var(--radius-control)] bg-surface-disabled', className)}
    />
  )
}
