import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useErroPorSlug } from '../../erros/hooks/useErroPorSlug'
import { ROTA_DA_ABA } from '../utils/abasDoProvedor'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'

export interface DetalheDoErroNaListaProps {
  erroSlug: string
  codigo: string
  /** Caminho da página do erro já saneado; `null` quando o slug não passou no saneador. */
  caminhoDoErro: string | null
  provedorSlug: string
  campos: { slug: string; nome: string }[]
}

const CLASSE_LINK =
  'inline-flex items-center gap-1 text-sm font-semibold text-primary-medium underline-offset-4 hover:underline'

/**
 * O que aparece ao abrir um erro na lista: a correção, quando documentada, e os caminhos para a
 * página do erro e para o campo na tabela. O detalhe só é buscado quando a linha abre.
 */
export function DetalheDoErroNaLista({
  erroSlug,
  codigo,
  caminhoDoErro,
  provedorSlug,
  campos,
}: DetalheDoErroNaListaProps) {
  const { data: erro, isLoading, isError } = useErroPorSlug(erroSlug)
  const [campoPrincipal] = campos
  const urlDoErro =
    caminhoDoErro && typeof window !== 'undefined'
      ? `${window.location.origin}${caminhoDoErro}`
      : null

  return (
    <div className="flex flex-col gap-4 pt-3">
      {isLoading && (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Carregando a correção do erro {codigo}…</span>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted">
          Não deu para carregar a correção agora. Abra a página do erro.
        </p>
      )}

      {erro && (
        <div className="flex flex-col gap-1">
          <h3 className="text-card-titulo font-bold text-primary">Como corrigir</h3>
          {erro.solucaoSugerida ? (
            <p className="text-sm leading-relaxed whitespace-pre-line text-ink">
              {erro.solucaoSugerida}
            </p>
          ) : (
            <p className="text-sm text-muted">A correção deste erro ainda não foi documentada.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {urlDoErro && (
          <BotaoCopiar
            valor={urlDoErro}
            ariaLabel={`Copiar link do erro ${codigo}`}
            rotulo="Copiar link deste erro"
            icone="link"
            compacto
          />
        )}
        {caminhoDoErro && (
          <Link to={caminhoDoErro as unknown as LinkProps['to']} className={CLASSE_LINK}>
            Abrir a página do erro
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
        {campoPrincipal && (
          <Link
            to={ROTA_DA_ABA.campos}
            params={{ provedorSlug }}
            hash={construirIdLinhaCampo(campoPrincipal.slug)}
            className={CLASSE_LINK}
          >
            Ver {campoPrincipal.nome} na tabela
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  )
}
