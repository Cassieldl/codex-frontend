import { ArrowDown, ArrowRight } from 'lucide-react'
import type { EtapaDoFluxo } from './blocosDoArtigo'

export interface FluxoDeEtapasProps {
  etapas: EtapaDoFluxo[]
}

/** Caixas ligadas por seta: vertical abaixo de 640px, horizontal acima. O texto nunca vira HTML. */
export function FluxoDeEtapas({ etapas }: FluxoDeEtapasProps) {
  return (
    <ol aria-label="Fluxo" className="flex list-none flex-col gap-2 sm:flex-row sm:flex-wrap">
      {etapas.map((etapa, indice) => {
        const ultima = indice === etapas.length - 1

        return (
          <li
            key={`${indice}-${etapa.titulo}`}
            className="flex flex-col items-center gap-2 sm:flex-1 sm:flex-row sm:items-stretch"
          >
            <div className="flex w-full flex-col gap-1 rounded-[var(--radius-control)] border border-primary-light bg-alert-info p-3 text-ink sm:min-w-32">
              <span className="font-semibold">{etapa.titulo}</span>
              {etapa.descricao && <span className="text-sm">{etapa.descricao}</span>}
            </div>
            {!ultima && (
              <>
                <ArrowDown
                  className="size-5 shrink-0 text-primary-light sm:hidden"
                  aria-hidden="true"
                />
                <ArrowRight
                  className="hidden size-5 shrink-0 self-center text-primary-light sm:block"
                  aria-hidden="true"
                />
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}
