import { Link, type LinkProps } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useEffect } from 'react'
import {
  CabecalhoPublico,
  ID_CONTEUDO_PRINCIPAL,
} from '../../../components/layout/CabecalhoPublico'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import { CONTEUDO_RODAPE_CONSTANTE } from '../../../utils/rodapeConteudoConstante'
import { handleApiError } from '../../../utils/handleApiError'
import { useErrosPorCodigo } from '../hooks/useErrosPorCodigo'

export interface NavegarOpcoes {
  href: string
  replace?: boolean
}

export interface ErrosIndexPageProps {
  codigo: string
  /**
   * Injetado pela rota fina (`src/routes/erros/index.tsx`), que usa
   * `Route.useNavigate()` de verdade — manter como prop deixa o
   * redirecionamento automático testável sem montar um `RouterProvider`.
   */
  navigate: (opcoes: NavegarOpcoes) => void
}

const EMAIL_SUPORTE = CONTEUDO_RODAPE_CONSTANTE.atendimento.emailSuporte

/**
 * `/erros?codigo=` — atalho de desambiguação (M2, §7.3). O suporte cola um
 * link previsível a partir do código puro: resolve direto quando o código é
 * único, desambigua quando existe em mais de um provedor, e explica quando
 * não documentado — nunca aparência de erro de aplicação nos três casos.
 */
export function ErrosIndexPage({ codigo, navigate }: ErrosIndexPageProps) {
  const { data, isLoading, isError, error, refetch } = useErrosPorCodigo(codigo)

  const resolveDireto = data?.totalCount === 1

  useEffect(() => {
    if (!data || data.totalCount !== 1) return
    const [unico] = data.items
    // `unico.url` vem da API — só navega se passar por `caminhoInternoSeguro`
    // (BAIXO-02, defesa em profundidade). Não deveria falhar na prática (o
    // backend garante `Slug`); se falhar, a página fica no skeleton em vez
    // de redirecionar para um destino não validado.
    const caminho = unico ? caminhoInternoSeguro(unico.url) : undefined
    if (caminho) navigate({ href: caminho, replace: true })
  }, [data, navigate])

  const mensagemErro = isAxiosError(error) ? handleApiError(error) : undefined

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8"
      >
        {(isLoading || resolveDireto) && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">
              {resolveDireto
                ? 'Código encontrado — abrindo o erro…'
                : `Buscando o código ${codigo}…`}
            </span>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {isError && <ErrorState message={mensagemErro} onRetry={() => refetch()} />}

        {!isLoading && !isError && data && data.totalCount === 0 && (
          <EmptyState
            message={`O Codex ainda não documenta o código "${codigo}".`}
            action={
              <a
                href={`mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent(
                  'Codex · código de erro não documentado',
                )}&body=${encodeURIComponent(`Código buscado: ${codigo}`)}`}
                className="text-sm font-semibold text-primary-medium hover:underline"
              >
                Falar com o suporte
              </a>
            }
          />
        )}

        {!isLoading && !isError && data && data.totalCount > 1 && (
          <>
            <h1 className="text-subtitulo font-semibold text-ink">
              O código {codigo} existe em mais de um provedor
            </h1>
            <p className="text-sm text-muted">Escolha qual delas corresponde ao seu caso.</p>

            <ul className="flex flex-col gap-2">
              {data.items.map((item) => {
                const caminho = caminhoInternoSeguro(item.url)
                const conteudo = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-ink">
                        {item.codigo}
                      </span>
                      <span
                        className="text-xs text-ink/70"
                        aria-label={
                          item.provedorNome
                            ? undefined
                            : 'Geral — este erro não é específico de um provedor'
                        }
                        title={
                          item.provedorNome
                            ? undefined
                            : 'Este erro não é específico de um provedor'
                        }
                      >
                        {item.provedorNome ?? 'Geral'}
                      </span>
                    </div>
                    <p className="text-sm text-ink/80">{item.titulo}</p>
                  </>
                )

                return (
                  <li key={item.slug}>
                    {caminho ? (
                      <Link
                        to={caminho as unknown as LinkProps['to']}
                        className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-border p-4 hover:shadow-hover"
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
