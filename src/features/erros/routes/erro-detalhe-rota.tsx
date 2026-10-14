import { useParams } from '@tanstack/react-router'
import { useNavegarParaCanonica } from '../../../hooks/useNavegarParaCanonica'
import { ErroDetalhePage } from './erro-detalhe'

/**
 * Liga `/erros/{erroSlug}` à página. O caminho atual vem do parâmetro da própria rota, nunca da
 * localização do router, que já é o destino durante uma navegação para fora (ver
 * `provedor-layout-rota.tsx`).
 */
export function ErroDetalheRota() {
  const { erroSlug } = useParams({ from: '/erros/$erroSlug' })
  const navegar = useNavegarParaCanonica()

  return (
    <ErroDetalhePage erroSlug={erroSlug} caminhoAtual={`/erros/${erroSlug}`} navegar={navegar} />
  )
}
