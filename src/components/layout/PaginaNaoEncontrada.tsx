import { Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { EstadoIndisponivel } from '../ui/EstadoIndisponivel'
import { CabecalhoPublico } from './CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from './PularParaConteudo'
import { RodapeContextual } from './RodapeContextual'

/**
 * Endereço que não corresponde a rota nenhuma.
 *
 * Sem isto, o TanStack Router renderiza o próprio aviso: um "Not Found" em
 * inglês, sem cabeçalho, sem navegação e sem saída. Num portal público, URL
 * errada ou antiga é rotina (link velho em ticket, endereço digitado à mão,
 * buscador apontando para conteúdo que mudou de lugar), então a página explica
 * e oferece caminho de volta, como as de artigo, erro, provedor e versão.
 */
export function PaginaNaoEncontrada() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-pagina flex-1 flex-col justify-center px-4 py-8 lg:px-8"
      >
        <EstadoIndisponivel
          icone={Compass}
          titulo="Página não encontrada."
          tituloDaAba="Página não encontrada"
          descricao="Confira o endereço ou use a busca para encontrar o que procura."
        >
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
        </EstadoIndisponivel>
      </main>

      <RodapeContextual contexto={{ tipo: 'erro-sem-contexto' }} />
    </div>
  )
}
