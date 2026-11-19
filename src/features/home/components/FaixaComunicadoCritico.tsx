import { Link, type LinkProps } from '@tanstack/react-router'
import { TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import type { ComunicadoVigenteHome } from '../types/home'
import { formatarDataHora } from '../utils/formatarDatas'
import { rotuloAlvoComunicado } from '../utils/severidadeComunicado'

export interface FaixaComunicadoCriticoProps {
  comunicados: ComunicadoVigenteHome[]
}

function LinhaCritica({ comunicado }: { comunicado: ComunicadoVigenteHome }) {
  const caminho = caminhoInternoSeguro(comunicado.url)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="min-w-0 flex-1 font-semibold text-ink">
        {rotuloAlvoComunicado(comunicado.provedorNome)}: {comunicado.titulo}
      </span>

      <span className="shrink-0 text-xs text-ink">
        Sai do ar em {formatarDataHora(comunicado.expiraEm)}
      </span>

      {/*
        `url` é `null` em comunicado global (PQ-15 — não há provedor para
        abrir). O saneamento vem junto do ramo, não junto do dado: o dia em
        que o backend passar a mandar uma URL, ela já entra filtrada.
      */}
      {caminho && (
        <Link
          to={caminho as unknown as LinkProps['to']}
          className="shrink-0 text-xs font-semibold text-primary-medium hover:underline"
        >
          Ver detalhe
        </Link>
      )}
    </div>
  )
}

/**
 * Faixa do topo da Home para comunicados `Critico` de **qualquer abrangência**
 * (arquitetura §5.D/U-5 — o PRD falava só de global, mas a faixa do artboard
 * nomeia provedor; a Home recebe todos os vigentes e a UI distribui).
 *
 * `role="alert"` de propósito: é a única informação da página que interrompe o
 * leitor de tela, e ela nunca depende só de cor — ícone + a palavra "Crítico"
 * carregam o mesmo significado.
 *
 * Dispensável **na sessão**: o estado é `useState` local e volta no próximo
 * carregamento. Nada é persistido — incidente em curso não pode ser silenciado
 * para sempre com um clique.
 */
export function FaixaComunicadoCritico({ comunicados }: FaixaComunicadoCriticoProps) {
  const [dispensada, setDispensada] = useState(false)
  const [expandida, setExpandida] = useState(false)

  const criticos = comunicados.filter((comunicado) => comunicado.severidade === 'Critico')
  if (criticos.length === 0 || dispensada) return null

  const [principal, ...demais] = criticos

  return (
    <div role="alert" className="border-b border-alert-error-borda bg-alert-error">
      <div className="mx-auto flex max-w-pagina items-start gap-3 px-4 py-2.5 lg:px-8">
        <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-aux font-bold uppercase tracking-wider text-alert-error-texto">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          Crítico
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <LinhaCritica comunicado={principal} />

          {expandida &&
            demais.map((comunicado) => (
              <LinhaCritica
                key={`${comunicado.titulo}-${comunicado.expiraEm}`}
                comunicado={comunicado}
              />
            ))}
        </div>

        {demais.length > 0 && (
          <button
            type="button"
            aria-expanded={expandida}
            onClick={() => setExpandida((atual) => !atual)}
            className="shrink-0 px-1 py-0.5 text-xs font-semibold text-primary-medium hover:underline"
          >
            {expandida ? 'Recolher' : `+${demais.length} outro${demais.length > 1 ? 's' : ''}`}
          </button>
        )}

        <button
          type="button"
          onClick={() => setDispensada(true)}
          aria-label="Dispensar este comunicado nesta sessão"
          className="-m-2 shrink-0 p-2 text-alert-error-texto hover:underline"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
