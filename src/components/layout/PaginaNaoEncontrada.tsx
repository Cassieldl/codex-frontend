import { Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { CabecalhoPublico } from './CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from './PularParaConteudo'
import { RodapeContextual } from './RodapeContextual'

/**
 * Endereço que não corresponde a rota nenhuma.
 *
 * Sem isto, o TanStack Router renderiza o próprio aviso — um "Not Found" em
 * inglês, sem cabeçalho, sem navegação e sem saída. Num portal público, URL
 * errada ou antiga é rotina: link velho em ticket, endereço digitado à mão,
 * resultado de buscador apontando para conteúdo que mudou de lugar. A regra já
 * valia para os endereços que EXISTEM e não têm conteúdo (artigo, erro,
 * provedor, versão): página que explica, com caminho de volta. Esta fecha o
 * caso de quem nem chegou a uma rota.
 */
export function PaginaNaoEncontrada() {
  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-8 lg:px-8"
      >
        <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
          <Compass aria-hidden="true" className="size-10 text-muted" />
          <h1 className="text-titulo font-semibold text-ink">Esta página não existe.</h1>
          <p className="max-w-md text-sm text-muted">
            O endereço que você abriu não corresponde a nada no Codex. Ele pode ter mudado de lugar
            ou nunca ter existido.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/busca"
              search={{ q: '' }}
              className="text-sm font-semibold text-primary-medium hover:underline"
            >
              Buscar no Codex
            </Link>
            <Link to="/" className="text-sm font-semibold text-primary-medium hover:underline">
              Ir para o início
            </Link>
          </div>
        </div>
      </main>

      <RodapeContextual contexto={{ tipo: 'erro-sem-contexto' }} />
    </div>
  )
}
