import { Link, type LinkProps } from '@tanstack/react-router'
import { useState } from 'react'
import { EtiquetaSeveridade } from '../../../components/ui/EtiquetaSeveridade'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import type { ComunicadoVigenteHome } from '../types/home'
import { rotuloAlvoComunicado, SEVERIDADE_ETIQUETA } from '../utils/severidadeComunicado'

export interface ResumoComunicadosProps {
  comunicados: ComunicadoVigenteHome[]
}

const MAX_CHIPS_VISIVEIS = 3

const ID_PAINEL = 'comunicado-ativo-detalhe'

// `max-w-xs` cortava antes do assunto: descontada a etiqueta de severidade, o prefixo do alvo
// ("Todos os provedores: ") consumia quase toda a faixa e o chip virava "Todos os provedores:
// Tra...". A linha tem `flex-wrap`, então chip mais largo quebra linha em vez de transbordar.
const CLASSE_CHIP =
  'inline-flex max-w-md items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-white py-0.5 pl-0.5 pr-3 text-xs font-semibold text-ink hover:shadow-hover'

/**
 * Linha de chips dos comunicados vigentes **não críticos** (`Alerta` e
 * `Informativo`) — os críticos já ocupam a faixa do topo e não se repetem
 * aqui. Sem nenhum deles, a linha inteira some: ausência de comunicado é boa
 * notícia, não um vazio a preencher com mensagem.
 *
 * O título vai no texto do chip, nunca só em `title=`: atributo de tooltip não
 * é alcançável por teclado e o comunicado global — o que o PRD §2.1 nomeia — é
 * exatamente o que não tem link para abrir. O corpo fica a um clique, no painel
 * abaixo da linha, porque nenhuma outra tela pública mostra comunicado.
 */
export function ResumoComunicados({ comunicados }: ResumoComunicadosProps) {
  const [expandido, setExpandido] = useState(false)
  const [detalheAberto, setDetalheAberto] = useState<number | null>(null)

  const naoCriticos = comunicados.filter((comunicado) => comunicado.severidade !== 'Critico')
  if (naoCriticos.length === 0) return null

  const visiveis = expandido ? naoCriticos : naoCriticos.slice(0, MAX_CHIPS_VISIVEIS)
  const restantes = naoCriticos.length - visiveis.length

  const comunicadoAberto = detalheAberto === null ? null : visiveis[detalheAberto]
  const caminhoDoAberto = caminhoInternoSeguro(comunicadoAberto?.url ?? null)

  function alternarDetalhe(indice: number) {
    setDetalheAberto((atual) => (atual === indice ? null : indice))
  }

  return (
    <div className="flex flex-col gap-2 border-b border-line pb-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-aux font-semibold uppercase tracking-wider text-muted">
          Comunicados ativos
        </span>

        <ul className="flex min-w-0 flex-wrap items-center gap-2">
          {visiveis.map((comunicado, indice) => (
            <li key={`${comunicado.titulo}-${comunicado.expiraEm}`}>
              <button
                type="button"
                className={CLASSE_CHIP}
                aria-expanded={detalheAberto === indice}
                aria-controls={ID_PAINEL}
                onClick={() => alternarDetalhe(indice)}
              >
                <EtiquetaSeveridade severidade={SEVERIDADE_ETIQUETA[comunicado.severidade]} />
                <span className="truncate">
                  {rotuloAlvoComunicado(comunicado.provedorNome)}: {comunicado.titulo}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {(restantes > 0 || expandido) && (
          <button
            type="button"
            aria-expanded={expandido}
            onClick={() => {
              setExpandido((atual) => !atual)
              setDetalheAberto(null)
            }}
            className="text-xs font-semibold text-primary-medium hover:underline"
          >
            {expandido ? 'Mostrar menos' : `+${restantes} outro${restantes > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      <div id={ID_PAINEL}>
        {comunicadoAberto && (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-[var(--radius-card)] border border-border bg-surface-hover px-3 py-2 text-sm text-ink">
            <p className="min-w-0 flex-1">{comunicadoAberto.corpo}</p>

            {/*
              `url` é `null` em comunicado global (PQ-15 — não há provedor para
              abrir). O saneamento vem junto do ramo, não junto do dado.
            */}
            {caminhoDoAberto && (
              <Link
                to={caminhoDoAberto as unknown as LinkProps['to']}
                className="shrink-0 text-xs font-semibold text-primary-medium hover:underline"
              >
                Ver provedor
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
