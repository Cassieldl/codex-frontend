import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { BuscaPage } from '../features/busca/routes/busca-index'

export const buscaSearchSchema = z.object({
  q: z.string().catch(''),
  provedor: z.string().optional(),
  /** PQ-10 — nunca lido pela aplicação, só para o router não descartar o parâmetro. */
  origem: z.string().optional(),
})

export const Route = createFileRoute('/busca')({
  validateSearch: buscaSearchSchema,
  component: RouteComponent,
})

// Rota fina (§7.1) — toda a lógica mora em `features/busca/routes/busca-index.tsx`,
// testável isoladamente sem depender da árvore de rotas gerada.
function RouteComponent() {
  const { q, provedor } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <BuscaPage
      q={q}
      provedor={provedor}
      navigate={(opcoes) => {
        void navigate(opcoes as unknown as Parameters<typeof navigate>[0])
      }}
    />
  )
}
