import { useParams } from '@tanstack/react-router'
import { useNavegarParaCanonica } from '../../../hooks/useNavegarParaCanonica'
import { caminhoDoProvedor } from '../utils/caminhoDoProvedor'
import { ProvedorLayoutPage } from './provedor-layout'

/**
 * Liga `/provedores/{provedorSlug}` à página.
 *
 * O caminho em que a página está sendo servida vem dos PARÂMETROS da própria rota, nunca da
 * localização do router. Numa navegação para fora (Voltar, "Layout InvoiCy" no cabeçalho) a
 * localização já é o destino enquanto esta página ainda está montada esperando o chunk do destino;
 * comparar esse caminho com o canônico do provedor faria a correção de URL desfazer a saída. Os
 * parâmetros só mudam quando a navegação se completa.
 */
export function ProvedorLayoutRota() {
  const { provedorSlug } = useParams({ from: '/provedores/$provedorSlug' })
  const navegar = useNavegarParaCanonica()

  return (
    <ProvedorLayoutPage
      provedorSlug={provedorSlug}
      caminhoAtual={caminhoDoProvedor(provedorSlug)}
      navegar={navegar}
    />
  )
}
