import { redirect } from '@tanstack/react-router'

export interface ContextoDoRedirecionamento {
  params: { provedorSlug: string }
  location: { hash: string }
}

/**
 * `/provedores/{slug}/{versao}` virou endereço antigo: a página do provedor já mostra o conteúdo.
 * Leva para `/provedores/{slug}` mantendo a âncora, e o router troca a entrada do histórico em vez
 * de empilhar uma nova, então o Voltar não cai de novo no endereço antigo.
 */
export function redirecionarVersaoParaProvedor({ params, location }: ContextoDoRedirecionamento) {
  throw redirect({
    to: '/provedores/$provedorSlug',
    params: { provedorSlug: params.provedorSlug },
    hash: location.hash || undefined,
    replace: true,
  })
}
