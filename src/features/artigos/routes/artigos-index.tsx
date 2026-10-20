import { useState } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { AbasNavegaveis, type AbaNavegavel } from '../../../components/ui/AbasNavegaveis'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Pagination } from '../../../components/ui/Pagination'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { CampoBusca } from '../../busca/components/CampoBusca'
import { CardArtigo } from '../components/CardArtigo'
import { EstadoTipoArtigoVazio } from '../components/EstadoTipoArtigoVazio'
import { LEITURA_TIPO_ARTIGO, ROTULO_TIPO_ARTIGO } from '../components/rotulosTipoArtigo'
import { useArtigos } from '../hooks/useArtigos'
import { TIPOS_ARTIGO, type TipoArtigo } from '../types/artigo'

const TAMANHO_PAGINA_PADRAO = 25

export interface BuscaArtigos {
  q?: string
  tipo?: TipoArtigo
  pagina: number
}

export interface ArtigosIndexPageProps extends BuscaArtigos {
  /**
   * Injetado pela rota fina (`src/routes/artigos/index.tsx`), que usa
   * `Route.useNavigate()` de verdade e preserva os demais parâmetros da URL
   * (inclusive `origem`, PQ-10).
   */
  navegar: (busca: Partial<BuscaArtigos>) => void
}

/**
 * `/artigos` — índice do acervo editorial (tela 7).
 *
 * **Desvio deliberado do artboard (§2.1):** os três tipos viram **abas por
 * URL** em vez de seções simultâneas. O contrato de P7 devolve uma única
 * página paginada com filtro por tipo — renderizar as três seções juntas com
 * contagem total exigiria 3+ requisições por carga. A aba preserva a
 * exigência de "tipo é estrutura" e ainda deixa o filtro copiável no link.
 */
export function ArtigosIndexPage({ q, tipo, pagina, navegar }: ArtigosIndexPageProps) {
  useTituloDaPagina('Artigos')

  const [termo, setTermo] = useState(q ?? '')
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)

  const { data, isLoading, isError, refetch } = useArtigos({
    q: q || undefined,
    tipo,
    pagina,
    tamanhoPagina,
  })

  const abas: AbaNavegavel[] = [
    {
      rotulo: 'Todos',
      to: '/artigos',
      search: { pagina: 1, ...(q ? { q } : {}) },
      ativa: tipo === undefined,
    },
    ...TIPOS_ARTIGO.map((tipoDaAba) => ({
      rotulo: ROTULO_TIPO_ARTIGO[tipoDaAba],
      to: '/artigos',
      search: { tipo: tipoDaAba, pagina: 1, ...(q ? { q } : {}) },
      ativa: tipo === tipoDaAba,
    })),
  ]

  const listaVazia = Boolean(data && data.items.length === 0)

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-titulo font-bold text-ink">Índice de artigos</h1>
          <p className="max-w-2xl text-sm text-muted">
            O que o suporte explica repetidamente, escrito uma vez. Artigo não tem prazo: a única
            data é a verificação.
          </p>
        </div>

        <CampoBusca
          valor={termo}
          onValorChange={setTermo}
          onSubmit={() => navegar({ q: termo || undefined, pagina: 1 })}
          placeholder="Buscar por título ou assunto do artigo"
          rotuloOculto="Buscar artigo"
        />

        <AbasNavegaveis abas={abas} ariaLabel="Tipos de artigo" />

        {tipo && <p className="text-xs text-muted">{LEITURA_TIPO_ARTIGO[tipo]}</p>}

        {isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Carregando artigos…</span>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && listaVazia && tipo && (
          // §2.1 — o acervo de um tipo estar vazio é um estado **nomeado**, não
          // um "nenhum item encontrado" genérico: o leitor precisa saber que o
          // tipo existe. Com termo buscado, aí sim é busca sem resultado.
          <EstadoTipoArtigoVazio variante={q ? 'sem-resultado' : 'sem-acervo'} tipo={tipo} />
        )}

        {!isLoading && !isError && listaVazia && !tipo && (
          <EmptyState
            message={
              q
                ? `Nenhum artigo corresponde a “${q}”.`
                : 'Nenhum artigo publicado ainda. O acervo cresce a partir dos chamados.'
            }
          />
        )}

        {!isLoading && !isError && data && data.items.length > 0 && (
          <>
            <div className="border-t border-line">
              {data.items.map((artigo) => (
                <CardArtigo key={artigo.slug} artigo={artigo} mostrarTipo={tipo === undefined} />
              ))}
            </div>

            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              totalCount={data.totalCount}
              totalPages={data.totalPages}
              onPageChange={(novaPagina) => navegar({ pagina: novaPagina })}
              onPageSizeChange={(novoTamanho) => {
                setTamanhoPagina(novoTamanho)
                navegar({ pagina: 1 })
              }}
            />
          </>
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'artigos' }} />
    </div>
  )
}
