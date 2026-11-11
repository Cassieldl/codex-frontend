import { createFileRoute } from '@tanstack/react-router'
import { useProvedorPorSlug } from '../../../features/provedores/hooks/useProvedorPorSlug'
import { ProvedorIndexConteudo } from '../../../features/provedores/routes/provedor-index'

export const Route = createFileRoute('/provedores/$provedorSlug/')({
  component: ProvedorIndexRoute,
})

/** Conteúdo de `/provedores/{slug}`. Reusa a `queryKey` do `route.tsx` pai, já carregada. */
function ProvedorIndexRoute() {
  const { provedorSlug } = Route.useParams()
  const { data: provedor } = useProvedorPorSlug(provedorSlug)

  if (!provedor) return null

  return (
    <ProvedorIndexConteudo
      provedorSlug={provedorSlug}
      provedorNome={provedor.nome}
      versoes={provedor.versoes}
    />
  )
}
