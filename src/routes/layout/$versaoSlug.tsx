import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { LayoutVersaoPage } from '../../features/layout/routes/layout-versao'
import { VISOES_DO_LAYOUT } from '../../features/layout/types/estruturaLayout'

export const layoutVersaoSearchSchema = z.object({
  /** Aba aberta: dicionário (padrão) ou a estrutura em XML ou JSON. */
  visao: z.enum(VISOES_DO_LAYOUT).default('dicionario').catch('dicionario'),
  /** PQ-10: nunca lido pela aplicação, só para o router não descartar o parâmetro. */
  origem: z.string().optional(),
})

// Rota fina (M2): o dicionário denso vive em `features/layout/routes/layout-versao.tsx`.
export const Route = createFileRoute('/layout/$versaoSlug')({
  validateSearch: layoutVersaoSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { versaoSlug } = Route.useParams()
  const { visao } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <LayoutVersaoPage
      versaoSlug={versaoSlug}
      visao={visao}
      aoMudarVisao={(novaVisao) => {
        // Trocar de aba não empilha histórico nem leva a página ao topo; a âncora sai junto.
        void navigate({
          search: (anterior) => ({ ...anterior, visao: novaVisao }),
          replace: true,
          resetScroll: false,
        })
      }}
    />
  )
}
