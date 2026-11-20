import { Link, type LinkProps } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { CircleHelp } from 'lucide-react'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { CLASSE_HOVER_DO_CARD_CLICAVEL } from '../../../components/ui/classesDeCard'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { EstadoIndisponivel } from '../../../components/ui/EstadoIndisponivel'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import { montarLinkSuporte, ROTULO_FALAR_COM_SUPORTE } from '../../../utils/linkSuporte'
import { handleApiError } from '../../../utils/handleApiError'
import { temCodigoParaBuscar, useErrosPorCodigo } from '../hooks/useErrosPorCodigo'

export interface NavegarOpcoes {
  href: string
  replace?: boolean
}

/**
 * Assunto da aba conforme o desfecho. `null` enquanto carrega, quando resolve direto (a página do
 * erro assume) e sem código (o estado "não informado" nomeia a aba).
 */
function tituloDaAbaDoCodigo(codigo: string, totalEncontrado: number | undefined): string | null {
  if (totalEncontrado === undefined || totalEncontrado === 1) return null
  if (totalEncontrado === 0) return `Código ${codigo.trim()} não encontrado`
  return `Código ${codigo.trim()}`
}

export interface ErrosIndexPageProps {
  codigo: string
  /**
   * Injetado pela rota fina (`src/routes/erros/index.tsx`), que usa
   * `Route.useNavigate()` de verdade: manter como prop deixa o
   * redirecionamento automático testável sem montar um `RouterProvider`.
   */
  navigate: (opcoes: NavegarOpcoes) => void
}

/**
 * `/erros?codigo=`: atalho de desambiguação (M2, §7.3). O suporte cola um
 * link previsível a partir do código puro: resolve direto quando o código é
 * único, desambigua quando existe em mais de um provedor, e explica quando
 * não documentado; nunca aparência de erro de aplicação nos três casos.
 */
export function ErrosIndexPage({ codigo, navigate }: ErrosIndexPageProps) {
  const { data, isLoading, isError, error, refetch } = useErrosPorCodigo(codigo)

  const resolveDireto = data?.totalCount === 1

  // Sem código a query nem roda, então não há `data` para cair em nenhum dos estados abaixo,
  // sem este caso a rota renderiza um `<main>` vazio, que é o pior retorno possível para quem
  // chegou por um link do suporte com o parâmetro perdido.
  const semCodigo = !temCodigoParaBuscar(codigo)

  useEffect(() => {
    if (!data || data.totalCount !== 1) return
    const [unico] = data.items
    // O slug vem da API: o caminho montado com ele só navega se passar por
    // `caminhoInternoSeguro` (defesa em profundidade); se falhar, a página fica
    // no skeleton em vez de redirecionar para um destino não validado.
    const caminho = unico ? caminhoInternoSeguro(`/erros/${unico.slug}`) : undefined
    if (caminho) navigate({ href: caminho, replace: true })
  }, [data, navigate])

  const mensagemErro = isAxiosError(error) ? handleApiError(error) : undefined

  useTituloDaPagina(tituloDaAbaDoCodigo(codigo, data?.totalCount))

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-pagina flex-1 flex-col gap-6 px-4 py-8 lg:px-8"
      >
        {(isLoading || resolveDireto) && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">
              {resolveDireto
                ? 'Código encontrado. Abrindo o erro…'
                : `Buscando o código ${codigo}…`}
            </span>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {semCodigo && (
          <EstadoIndisponivel
            icone={CircleHelp}
            titulo="Nenhum código de erro foi informado."
            tituloDaAba="Código de erro não informado"
            descricao="Busque pelo código ou pela mensagem do erro."
          >
            <Link
              to="/busca"
              search={{ q: '' }}
              className="text-sm font-semibold text-primary-medium hover:underline"
            >
              Buscar no Codex
            </Link>
          </EstadoIndisponivel>
        )}

        {isError && <ErrorState message={mensagemErro} onRetry={() => refetch()} />}

        {!isLoading && !isError && data && data.totalCount === 0 && (
          <EmptyState
            message={`Nenhum erro encontrado com o código "${codigo}".`}
            action={
              <a
                href={montarLinkSuporte(
                  'Codex · código de erro não encontrado',
                  `Código buscado: ${codigo}`,
                )}
                className="text-sm font-semibold text-primary-medium hover:underline"
              >
                {ROTULO_FALAR_COM_SUPORTE}
              </a>
            }
          />
        )}

        {!isLoading && !isError && data && data.totalCount > 1 && (
          <>
            <h1 className="text-subtitulo font-semibold text-ink">
              O código {codigo} existe em mais de um provedor
            </h1>
            <p className="text-sm text-muted">Escolha o erro que corresponde ao seu caso.</p>

            <ul className="flex flex-col gap-2">
              {data.items.map((item) => {
                const caminho = caminhoInternoSeguro(`/erros/${item.slug}`)
                const conteudo = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-ink">
                        {item.codigo}
                      </span>
                      <span
                        className="text-xs text-muted"
                        aria-label={
                          item.provedorNome
                            ? undefined
                            : 'Geral: este erro vale para qualquer provedor'
                        }
                        title={
                          item.provedorNome ? undefined : 'Este erro vale para qualquer provedor'
                        }
                      >
                        {item.provedorNome ?? 'Geral'}
                      </span>
                    </div>
                    <p className="text-sm text-ink">{item.titulo}</p>
                  </>
                )

                return (
                  <li key={item.slug}>
                    {caminho ? (
                      <Link
                        to={caminho as unknown as LinkProps['to']}
                        className={`flex flex-col gap-1 rounded-[var(--radius-card)] border border-border bg-white p-4 ${CLASSE_HOVER_DO_CARD_CLICAVEL}`}
                      >
                        {conteudo}
                      </Link>
                    ) : (
                      <div className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-border p-4">
                        {conteudo}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'erro-sem-contexto' }} />
    </div>
  )
}
