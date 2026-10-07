import { Link, type LinkProps } from '@tanstack/react-router'
import clsx from 'clsx'
import { EtiquetaSeveridade } from '../../../components/ui/EtiquetaSeveridade'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import type { SeveridadeComunicado } from '../../home/types/home'
import { formatarDataHora } from '../../home/utils/formatarDatas'
import { rotuloAlvoComunicado, SEVERIDADE_ETIQUETA } from '../../home/utils/severidadeComunicado'
import { useComunicadosDoContexto } from '../hooks/useComunicadosDoContexto'
import type { ComunicadoContexto, ContextoDeComunicados } from '../types/comunicadoContexto'

export interface ComunicadosDoContextoProps extends ContextoDeComunicados {
  /**
   * Caminho da página em que o bloco está. O link do comunicado que aponta para a própria página
   * não aparece: levaria o leitor ao lugar onde ele já está.
   */
  caminhoAtual?: string
}

// Mesmos pares de fundo e texto da faixa crítica da Home e da etiqueta de severidade — a cor
// nunca é o único sinal: a etiqueta traz ícone e a palavra.
const CLASSE_CARD: Record<SeveridadeComunicado, string> = {
  Critico: 'border-severidade-critico-texto bg-alert-error',
  Alerta: 'border-severidade-alerta-texto bg-alert-warning',
  Informativo: 'border-primary-medium bg-alert-info',
}

/** Provedor + versão quando o comunicado é de uma versão: o leitor sabe a qual ele se refere. */
function rotuloAlvo(comunicado: ComunicadoContexto): string {
  const nomeProvedor = rotuloAlvoComunicado(comunicado.provedor?.nome ?? null)

  return comunicado.versao ? `${nomeProvedor} · ${comunicado.versao.rotulo}` : nomeProvedor
}

function rotuloLink(comunicado: ComunicadoContexto): string {
  return comunicado.versao ? `Ver versão ${comunicado.versao.rotulo}` : 'Ver provedor'
}

interface CardComunicadoProps {
  comunicado: ComunicadoContexto
  caminhoAtual: string | undefined
}

function CardComunicado({ comunicado, caminhoAtual }: CardComunicadoProps) {
  const caminho = caminhoInternoSeguro(comunicado.url)
  const mostrarLink = caminho !== undefined && caminho !== caminhoAtual

  return (
    <div
      role={comunicado.severidade === 'Critico' ? 'alert' : undefined}
      className={clsx(
        'flex flex-col gap-2 rounded-[var(--radius-card)] border border-l-4 px-4 py-3 text-ink',
        CLASSE_CARD[comunicado.severidade],
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <EtiquetaSeveridade severidade={SEVERIDADE_ETIQUETA[comunicado.severidade]} />
        <span className="text-xs font-semibold">{rotuloAlvo(comunicado)}</span>
        <span className="text-xs">Vigente até {formatarDataHora(comunicado.expiraEm)}</span>
      </div>

      <h3 className="text-card-titulo font-semibold">{comunicado.titulo}</h3>
      <p className="whitespace-pre-line text-sm">{comunicado.corpo}</p>

      {mostrarLink && (
        <Link
          to={caminho as unknown as LinkProps['to']}
          className="self-start text-xs font-semibold text-primary-medium hover:underline"
        >
          {rotuloLink(comunicado)}
        </Link>
      )}
    </div>
  )
}

/**
 * Comunicados no ar para o contexto da página aberta (provedor, versão ou os provedores de um
 * erro), no topo do conteúdo. Mesma etiqueta de severidade, mesmos pares de cor e mesmo rótulo de
 * alvo da Home — não é um segundo visual para a mesma coisa.
 *
 * O comunicado complementa a página, nunca é o assunto dela, então este bloco não derruba nem
 * atrasa nada: enquanto carrega, e quando não há comunicado, não ocupa lugar. Se a leitura
 * falha, fica só uma linha discreta com "Tentar novamente" — calar o erro faria um incidente em
 * curso parecer ausência de incidente.
 */
export function ComunicadosDoContexto({
  provedorSlugs,
  versaoSlug,
  caminhoAtual,
}: ComunicadosDoContextoProps) {
  const {
    data: comunicados,
    isError,
    refetch,
  } = useComunicadosDoContexto({ provedorSlugs, versaoSlug })

  if (isError) {
    return (
      <p role="status" className="flex flex-wrap items-center gap-2 text-xs text-muted">
        Não foi possível verificar os comunicados agora.
        <button
          type="button"
          onClick={() => refetch()}
          className="font-semibold text-primary-medium hover:underline"
        >
          Tentar novamente
        </button>
      </p>
    )
  }

  if (!comunicados || comunicados.length === 0) return null

  return (
    <section aria-labelledby="comunicados-contexto-titulo" className="flex flex-col gap-3">
      <h2 id="comunicados-contexto-titulo" className="sr-only">
        Comunicados ativos
      </h2>

      <ul className="flex flex-col gap-3">
        {comunicados.map((comunicado) => (
          <li key={comunicado.id}>
            <CardComunicado comunicado={comunicado} caminhoAtual={caminhoAtual} />
          </li>
        ))}
      </ul>
    </section>
  )
}
