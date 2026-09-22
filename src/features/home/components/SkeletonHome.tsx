import { Skeleton } from '../../../components/ui/Skeleton'

/**
 * Esqueleto por seção, não um spinner central: a Home tem três blocos de
 * altura muito diferente, e um indicador único no meio da tela faria o
 * conteúdo saltar quando cada um chegasse.
 */
export function SkeletonHome() {
  return (
    <div aria-busy="true" className="flex flex-col gap-11">
      <span className="sr-only" role="status">
        Carregando a página inicial…
      </span>

      <section className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-36 w-full" />
      </section>

      <section className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 w-full" />
      </section>

      <section className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </section>
    </div>
  )
}
