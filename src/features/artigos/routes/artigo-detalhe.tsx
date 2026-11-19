import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { isAxiosError } from 'axios'
import { useEffect } from 'react'
import { CabecalhoPublico } from '../../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../../components/layout/RodapeContextual'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { ConteudoArtigo } from '../../../components/ui/ConteudoArtigo'
import { ErrorState } from '../../../components/ui/ErrorState'
import { SeloVerificacao } from '../../../components/ui/SeloVerificacao'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import { SumarioArtigo } from '../../../components/ui/SumarioArtigo'
import { corrigirUrlCanonica } from '../../../utils/corrigirUrlCanonica'
import { handleApiError } from '../../../utils/handleApiError'
import { EstadoArtigoIndisponivel } from '../components/EstadoArtigoIndisponivel'
import { ReferenciasCruzadas } from '../components/ReferenciasCruzadas'
import { ROTULO_TIPO_ARTIGO } from '../components/rotulosTipoArtigo'
import { useArtigoPorSlug } from '../hooks/useArtigoPorSlug'
import { useLinkCanonico } from '../hooks/useLinkCanonico'
import type { ArtigoDetalhe } from '../types/artigo'
import { separarResumo } from '../utils/separarResumo'

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
 * Cabeçalho (trilha, título, resumo de abertura, verificação e link), corpo e lateral com o
 * sumário e as referências. No celular o sumário vai para o topo e as referências descem para o
 * fim; nos dois casos aparecem uma vez só.
 */
function ArtigoCarregado({ artigo }: { artigo: ArtigoDetalhe }) {
  const { resumo, restante } = separarResumo(artigo.corpo)
  const temReferencias =
    artigo.camposLayoutRelacionados.length > 0 || artigo.errosRelacionados.length > 0

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
      <article className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-3">
          {/* Mesma trilha textual da página do provedor e da versão do layout: volta ao índice
              sem depender do menu principal. */}
          <p className="text-xs text-muted">
            <Link
              to="/artigos"
              search={{ pagina: 1 }}
              activeOptions={{ exact: true }}
              className="link-texto"
            >
              Artigos
            </Link>{' '}
            / <span>{ROTULO_TIPO_ARTIGO[artigo.tipo]}</span>
          </p>
          <h1 className="max-w-3xl text-titulo font-extrabold text-primary lg:text-h1">
            {artigo.titulo}
          </h1>
          {resumo && <ConteudoArtigo corpo={resumo} className="max-w-3xl" />}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {artigo.verificadoEm && <SeloVerificacao data={artigo.verificadoEm} />}
            <BotaoCopiar
              compacto
              icone="link"
              valor={() => window.location.href}
              ariaLabel={`Copiar link do artigo ${artigo.titulo}`}
              rotulo="Copiar link"
            />
          </div>
        </header>

        {/* Sumário colapsado no topo em telas estreitas: `<details>` nativo, acessível por
            padrão e sem JS extra (§3.6). */}
        <details className="rounded-[var(--radius-card)] border border-border bg-white p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Nesta página</summary>
          <SumarioArtigo corpo={artigo.corpo} mostrarTitulo={false} className="mt-3" />
        </details>

        <ConteudoArtigo corpo={restante} />
      </article>

      <aside
        aria-label="Navegação do artigo"
        className={clsx(
          'flex-col gap-6 lg:sticky lg:top-8 lg:flex lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto',
          temReferencias ? 'flex' : 'hidden',
        )}
      >
        <SumarioArtigo corpo={artigo.corpo} className="hidden lg:block" />
        {temReferencias && (
          <div className="flex flex-col gap-6 border-border lg:border-t lg:pt-6">
            <ReferenciasCruzadas
              camposLayout={artigo.camposLayoutRelacionados}
              erros={artigo.errosRelacionados}
            />
          </div>
        )}
      </aside>
    </div>
  )
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
  useTituloDaPagina(!isError && artigo ? artigo.titulo : null)

  const varianteIndisponivel = reservado ? 'reservado-ausente' : 'nao-encontrado'

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-pagina flex-1 flex-col gap-8 px-4 py-8 lg:px-8"
      >
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
          <ArtigoCarregado artigo={artigo} />
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'artigos' }} />
    </div>
  )
}
