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

function ChipComunicado({ comunicado }: { comunicado: ComunicadoVigenteHome }) {
  const caminho = caminhoInternoSeguro(comunicado.url)

  const conteudo = (
    <>
      <EtiquetaSeveridade severidade={SEVERIDADE_ETIQUETA[comunicado.severidade]} />
      <span className="truncate">{rotuloAlvoComunicado(comunicado.provedorNome)}</span>
    </>
  )

  const classe =
    'inline-flex max-w-xs items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-white py-0.5 pl-0.5 pr-3 text-xs font-semibold text-ink'

  // Comunicado global não tem provedor para abrir (`url: null`, PQ-15) — vira
  // texto, nunca um link que não leva a lugar nenhum.
  return caminho ? (
    <Link
      to={caminho as unknown as LinkProps['to']}
      className={`${classe} hover:shadow-hover`}
      title={comunicado.titulo}
    >
      {conteudo}
    </Link>
  ) : (
    <span className={classe} title={comunicado.titulo}>
      {conteudo}
    </span>
  )
}

/**
 * Linha de chips dos comunicados vigentes **não críticos** (`Alerta` e
 * `Informativo`) — os críticos já ocupam a faixa do topo e não se repetem
 * aqui. Sem nenhum deles, a linha inteira some: ausência de comunicado é boa
 * notícia, não um vazio a preencher com mensagem.
 */
export function ResumoComunicados({ comunicados }: ResumoComunicadosProps) {
  const [expandido, setExpandido] = useState(false)

  const naoCriticos = comunicados.filter((comunicado) => comunicado.severidade !== 'Critico')
  if (naoCriticos.length === 0) return null

  const visiveis = expandido ? naoCriticos : naoCriticos.slice(0, MAX_CHIPS_VISIVEIS)
  const restantes = naoCriticos.length - visiveis.length

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line pb-3">
      <span className="text-aux font-semibold uppercase tracking-wider text-muted">
        Comunicados ativos
      </span>

      <ul className="flex min-w-0 flex-wrap items-center gap-2">
        {visiveis.map((comunicado) => (
          <li key={`${comunicado.titulo}-${comunicado.expiraEm}`}>
            <ChipComunicado comunicado={comunicado} />
          </li>
        ))}
      </ul>

      {(restantes > 0 || expandido) && (
        <button
          type="button"
          aria-expanded={expandido}
          onClick={() => setExpandido((atual) => !atual)}
          className="text-xs font-semibold text-primary-medium hover:underline"
        >
          {expandido ? 'Mostrar menos' : `+${restantes} outro${restantes > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}
