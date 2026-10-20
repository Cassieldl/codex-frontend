import { Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Select } from '../../../components/ui/Select'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { montarLinkSuporte, ROTULO_FALAR_COM_SUPORTE } from '../../../utils/linkSuporte'
import { useProvedores } from '../../provedores/hooks/useProvedores'
import { BlocoAutocorrecao } from '../components/BlocoAutocorrecao'
import { CampoBusca } from '../components/CampoBusca'
import { GrupoResultadoLista } from '../components/GrupoResultadoLista'
import { useDebounce } from '../hooks/useDebounce'
import { useResultadoBusca } from '../hooks/useResultadoBusca'

const DEBOUNCE_MS = 300
const TODOS_OS_PROVEDORES = ''
// Lista de provedores só serve pra popular o seletor — nenhuma paginação de
// verdade é necessária aqui, então busca um lote grande de uma vez.
const TAMANHO_LOTE_PROVEDORES = 100

export interface BuscaSearchParams {
  q: string
  provedor?: string
}

export interface NavegarBuscaOpcoes {
  search: (atual: BuscaSearchParams) => BuscaSearchParams
  replace?: boolean
}

export interface BuscaPageProps {
  q: string
  provedor?: string
  /**
   * Injetado pela rota fina (`src/routes/busca.tsx`), que usa
   * `Route.useNavigate()` de verdade — manter como prop deixa a
   * sincronização de URL testável sem montar a árvore de rotas gerada.
   */
  navigate: (opcoes: NavegarBuscaOpcoes) => void
}

/**
 * `/busca?q=&provedor=` — tela 2, "o coração do produto" (§7.1). Extraído do
 * arquivo de rota para ser testável isoladamente, seguindo o mesmo padrão de
 * `features/erros/routes/erros-index.tsx`.
 */
export function BuscaPage({ q: qDaUrl, provedor, navigate }: BuscaPageProps) {
  const [termo, setTermo] = useState(qDaUrl)

  useTituloDaPagina(qDaUrl.trim() ? `Busca: ${qDaUrl.trim()}` : 'Busca')

  const termoComDebounce = useDebounce(termo, DEBOUNCE_MS)

  // Sincroniza a URL só depois do debounce assentar — não empilha histórico a
  // cada tecla, e é isso que torna o resultado copiável/reenviável (§7.1).
  useEffect(() => {
    if (termoComDebounce === qDaUrl) return
    navigate({ search: (anterior) => ({ ...anterior, q: termoComDebounce }), replace: true })
  }, [termoComDebounce, qDaUrl, navigate])

  const {
    data: resultado,
    isLoading,
    isError,
    error,
    refetch,
  } = useResultadoBusca({ q: termoComDebounce, provedor })

  // A lista de provedores só alimenta o seletor de filtro — se não vier
  // (loading ou erro), a busca continua funcionando sem filtro (P-01).
  const { data: provedoresPagina } = useProvedores({
    ordenarPor: 'nome',
    direcao: 'asc',
    tamanhoPagina: TAMANHO_LOTE_PROVEDORES,
  })

  const opcoesProvedor = [
    { value: TODOS_OS_PROVEDORES, label: 'Todos os provedores' },
    ...(provedoresPagina?.items.map((item) => ({ value: item.slug, label: item.nome })) ?? []),
  ]

  function aoMudarProvedor(valor: string) {
    navigate({
      search: (anterior) => ({ ...anterior, provedor: valor || undefined }),
      replace: true,
    })
  }

  const mensagemErro =
    isAxiosError(error) && error.response?.status === 429
      ? 'Muitas buscas em pouco tempo — aguarde alguns segundos.'
      : undefined

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico variante="destaque">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- a página de busca existe para digitar o termo */}
            <CampoBusca valor={termo} onValorChange={setTermo} autoFocus />
          </div>
          <Select
            label="Provedor"
            superficie="escura"
            options={opcoesProvedor}
            value={provedor ?? TODOS_OS_PROVEDORES}
            onValueChange={aoMudarProvedor}
            className="sm:w-56"
          />
        </div>
      </CabecalhoPublico>

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8"
      >
        {/* O campo no cabeçalho já diz visualmente o que é a página; o título existe para quem
            navega por títulos com leitor de tela, que sem ele chega a uma página sem nome. */}
        <h1 className="sr-only">Busca no Codex</h1>

        {isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">Carregando resultados da busca…</span>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {isError && <ErrorState message={mensagemErro} onRetry={() => refetch()} />}

        {!isLoading && !isError && resultado && (
          <>
            <BlocoAutocorrecao correcao={resultado.correcao} />

            {/*
              O texto descreve o RESULTADO, nunca a falha do motor. "Nenhum item bateu o termo
              inteiro" dizia à pessoa que não encontramos o que ela pediu — inclusive quando o
              item exibido era exatamente o caso dela —, e num público que já desconfia de
              documentação isso convida a abrir o chamado assim mesmo, que é o desfecho que o
              portal existe para evitar. A segunda frase troca a narração por uma ação.
            */}
            {resultado.qualidade === 'parcial' && (
              <p className="rounded-[var(--radius-control)] bg-alert-info px-4 py-2 text-sm text-primary-medium">
                Resultados aproximados — nenhum item reúne todos os termos que você digitou. Se
                nenhum servir, tente o código do erro ou um trecho menor da mensagem.
              </p>
            )}

            {resultado.qualidade === 'vazia' ? (
              <EmptyState
                message={`O Codex ainda não documenta "${resultado.termoUsado}".`}
                action={
                  <div className="flex flex-col items-center gap-2">
                    <BotaoCopiar
                      valor={resultado.termoUsado}
                      ariaLabel={`Copiar termo buscado "${resultado.termoUsado}"`}
                      rotulo="Copiar termo buscado"
                    />
                    <a
                      href={montarLinkSuporte(
                        'Codex · busca sem resultado',
                        `Termo buscado: ${resultado.termoUsado}`,
                      )}
                      className="text-sm font-semibold text-primary-medium hover:underline"
                    >
                      {ROTULO_FALAR_COM_SUPORTE}
                    </a>
                  </div>
                }
              />
            ) : (
              <div className="flex flex-col gap-8">
                {resultado.grupos.map((grupo) => (
                  <GrupoResultadoLista key={grupo.tipo} grupo={grupo} />
                ))}
              </div>
            )}

            {resultado.filtroProvedor &&
              resultado.foraDoFiltro &&
              resultado.foraDoFiltro.total > 0 && (
                <p className="text-xs text-muted">
                  {resultado.foraDoFiltro.total} resultados fora do filtro por{' '}
                  {resultado.filtroProvedor.nome} —{' '}
                  <Link
                    to="/busca"
                    search={{ q: resultado.termoUsado }}
                    className="font-semibold text-primary-medium hover:underline"
                  >
                    repetir a busca sem o filtro
                  </Link>
                </p>
              )}
          </>
        )}
      </main>

      <RodapeContextual
        contexto={{
          tipo: resultado?.qualidade === 'vazia' ? 'busca-sem-resultado' : 'busca-com-resultado',
        }}
      />
    </div>
  )
}
