import { isAxiosError } from 'axios'
import { parseISO } from 'date-fns'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { ConteudoArtigo } from '../../../components/ui/ConteudoArtigo'
import { ErrorState } from '../../../components/ui/ErrorState'
import { SeloVerificacao } from '../../../components/ui/SeloVerificacao'
import { Skeleton } from '../../../components/ui/Skeleton'
import { SumarioArtigo } from '../../../components/ui/SumarioArtigo'
import { corrigirUrlCanonica } from '../../../utils/corrigirUrlCanonica'
import { handleApiError } from '../../../utils/handleApiError'
import { EstadoArtigoIndisponivel } from '../components/EstadoArtigoIndisponivel'
import { EtiquetaTipoArtigo } from '../components/EtiquetaTipoArtigo'
import { ReferenciasCruzadas } from '../components/ReferenciasCruzadas'
import { useArtigoPorSlug } from '../hooks/useArtigoPorSlug'
import { useLinkCanonico } from '../hooks/useLinkCanonico'

export interface NavegarParaCanonica {
  href: string
  replace: boolean
}

export interface ArtigoDetalhePageProps {
  artigoSlug: string
  /**
   * Caminho em que a página está sendo servida (`/artigos/{slug}` ou
   * `/como-funciona`) — injetado pela rota fina. É o que se compara com
   * `urlCanonica` para decidir o redirecionamento (§3.1).
   */
  caminhoAtual: string
  /**
   * `true` só na rota fixa do artigo reservado (D2) — muda **apenas** a
   * variante do 404 (`reservado-ausente` em vez de `nao-encontrado`).
   */
  reservado?: boolean
  navegar: (opcoes: NavegarParaCanonica) => void
}

/**
 * `/artigos/{slug}` (tela 8) e `/como-funciona` (tela 9) — a mesma página,
 * porque o artigo reservado é um artigo em posição fixa, não uma tela própria
 * (D2). `404`/`410` são tratados distintos (§3.4), nunca colapsados.
 */
export function ArtigoDetalhePage({
  artigoSlug,
  caminhoAtual,
  reservado = false,
  navegar,
}: ArtigoDetalhePageProps) {
  const { data: artigo, isLoading, isError, error, refetch } = useArtigoPorSlug(artigoSlug)

  const status = isAxiosError(error) ? error.response?.status : undefined
  const mensagemErro = isAxiosError(error) ? handleApiError(error) : undefined

  // §3.1 — `urlCanonica` é a fonte única: quem decide o endereço do artigo é o
  // backend (`RotaCanonica`), o frontend só obedece. Cobre o caso de alguém
  // abrir `/artigos/como-funciona` e precisar cair em `/como-funciona`.
  // `corrigirUrlCanonica` (FRONT-A) valida o destino via `caminhoInternoSeguro`
  // por baixo — mesmo mecanismo compartilhado com provedor e erro (F-4).
  const correcao = artigo ? corrigirUrlCanonica(caminhoAtual, artigo.urlCanonica) : null
  const precisaRedirecionar = Boolean(correcao)

  useEffect(() => {
    if (correcao) navegar(correcao)
  }, [correcao, navegar])

  useLinkCanonico(artigo?.urlCanonica)

  const varianteIndisponivel = reservado ? 'reservado-ausente' : 'nao-encontrado'

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 lg:px-8">
        {(isLoading || precisaRedirecionar) && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">
              {precisaRedirecionar
                ? 'Abrindo o endereço oficial do artigo…'
                : 'Carregando o artigo…'}
            </span>
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {isError && status === 404 && (
          <EstadoArtigoIndisponivel variante={varianteIndisponivel} slugTentado={artigoSlug} />
        )}

        {isError && status === 410 && (
          <EstadoArtigoIndisponivel
            variante="despublicado"
            slugTentado={artigoSlug}
            motivo={mensagemErro}
          />
        )}

        {isError && status !== 404 && status !== 410 && (
          <ErrorState message={mensagemErro} onRetry={() => refetch()} />
        )}

        {!isLoading && !isError && artigo && !precisaRedirecionar && (
          <div className="grid gap-8 lg:grid-cols-[1fr_240px] lg:items-start">
            <article className="flex min-w-0 flex-col gap-6">
              <header className="flex flex-col gap-3 border-b border-line pb-6">
                <EtiquetaTipoArtigo tipo={artigo.tipo} />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className="max-w-2xl text-titulo font-bold text-ink">{artigo.titulo}</h1>
                  <BotaoCopiar
                    valor={() => window.location.href}
                    ariaLabel={`Copiar link do artigo ${artigo.titulo}`}
                    rotulo="Copiar link"
                  />
                </div>
                {artigo.verificadoEm && <SeloVerificacao data={parseISO(artigo.verificadoEm)} />}
              </header>

              {/* Sumário colapsado no topo em telas estreitas — `<details>`
                  nativo, acessível por padrão e sem JS extra (§3.6). */}
              <details className="rounded-[var(--radius-card)] border border-line p-4 lg:hidden">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  Nesta página
                </summary>
                <SumarioArtigo corpo={artigo.corpo} className="mt-3" />
              </details>

              <ConteudoArtigo
                corpo={artigo.corpo}
                className="flex flex-col gap-4 text-corpo text-ink/80 [&_a]:text-primary-medium [&_a]:underline [&_code]:font-mono [&_code]:text-sm [&_h2]:text-subtitulo [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:text-card-titulo [&_h3]:font-medium [&_h3]:text-ink [&_li]:list-disc [&_li]:ml-5 [&_pre]:overflow-x-auto [&_pre]:rounded-[var(--radius-control)] [&_pre]:bg-surface-disabled [&_pre]:p-3 [&_table]:w-full [&_table]:text-sm [&_th]:text-left"
              />

              <ReferenciasCruzadas
                camposLayout={artigo.camposLayoutRelacionados}
                erros={artigo.errosRelacionados}
              />
            </article>

            <aside className="hidden lg:sticky lg:top-8 lg:block">
              <SumarioArtigo corpo={artigo.corpo} />
            </aside>
          </div>
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'artigos' }} />
    </div>
  )
}
