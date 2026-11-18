import { redirect } from '@tanstack/react-router'
import { abaDoHash, ROTA_DA_ABA } from '../utils/abasDoProvedor'

export interface ContextoDoRedirecionamento {
  params: { provedorSlug: string }
  location: { hash: string }
}

/**
 * `/provedores/{slug}/{versao}` virou endereço antigo. Leva direto para a aba dona da âncora
 * (Erros quando não há âncora de aba), mantendo a âncora, e o router troca a entrada do histórico
 * em vez de empilhar uma nova, então o Voltar não cai de novo no endereço antigo.
 */
export function redirecionarVersaoParaProvedor({ params, location }: ContextoDoRedirecionamento) {
  const aba = abaDoHash(location.hash) ?? 'erros'

  throw redirect({
    to: ROTA_DA_ABA[aba],
    params: { provedorSlug: params.provedorSlug },
    hash: location.hash || undefined,
    replace: true,
  })
}
