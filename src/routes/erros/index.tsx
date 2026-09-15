import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ErrosIndexPage } from '../../features/erros/routes/erros-index'

export const errosSearchSchema = z.object({
  codigo: z.string().catch(''),
  /** PQ-10 — nunca lido pela aplicação, só para o router não descartar o parâmetro. */
  origem: z.string().optional(),
})

// Rota fina (M2, §7.3) — toda a lógica mora em `features/erros/routes/erros-index.tsx`,
// testável isoladamente sem depender da árvore de rotas gerada.
export const Route = createFileRoute('/erros/')({
  validateSearch: errosSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { codigo } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <ErrosIndexPage
      codigo={codigo}
      navigate={(opcoes) => {
        // `navigate({ href })` sai do espaço de rotas tipado desta rota (o
        // destino é a página de outro erro, `/erros/{slug}`) — o router
        // exige `search` explícito quando o alvo não é inferível
        // estaticamente. Mesmo padrão de cast via `unknown` já usado em
        // `AbasNavegaveis.tsx` para navegação por `href` livre.
        void navigate(opcoes as unknown as Parameters<typeof navigate>[0])
      }}
    />
  )
}
