import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ArtigosIndexPage } from '../../features/artigos/routes/artigos-index'

export const artigosSearchSchema = z.object({
  q: z.string().optional(),
  /** Valor ASCII do contrato (M-5) - o rótulo "Mudança/Migração" é só exibição. */
  tipo: z.enum(['Conceito', 'Procedimento', 'Mudanca', 'Configuracao']).optional(),
  pagina: z.coerce.number().int().min(1).catch(1),
  /** PQ-10: nunca lido pela aplicação, só para o router não descartar o parâmetro. */
  origem: z.string().optional(),
})

// Rota fina (§2) - toda a lógica mora em `features/artigos/routes/artigos-index.tsx`,
// testável isoladamente sem depender da árvore de rotas gerada.
export const Route = createFileRoute('/artigos/')({
  validateSearch: artigosSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { q, tipo, pagina } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <ArtigosIndexPage
      q={q}
      tipo={tipo}
      pagina={pagina}
      navegar={(busca) => {
        // Espalha o search anterior para preservar o que a página não conhece
        // (`origem`, PQ-10) em qualquer navegação de filtro/paginação.
        void navigate({ search: (anterior) => ({ ...anterior, ...busca }) })
      }}
    />
  )
}
