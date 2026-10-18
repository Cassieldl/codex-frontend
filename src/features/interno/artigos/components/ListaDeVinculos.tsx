import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export interface VinculoExibido {
  id: number
  rotulo: ReactNode
  /** Como o vínculo é anunciado no botão de remover. */
  nomeAcessivel: string
  desativado: boolean
}

export interface ListaDeVinculosProps {
  titulo: string
  vinculos: VinculoExibido[]
  mensagemVazia: string
  onRemover: (id: number) => void
}

/** Vínculos já escolhidos, sempre visíveis e removíveis, independente do que a busca mostra agora. */
export function ListaDeVinculos({
  titulo,
  vinculos,
  mensagemVazia,
  onRemover,
}: ListaDeVinculosProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted">
        {titulo} ({vinculos.length})
      </p>

      {vinculos.length === 0 ? (
        <p className="text-xs text-muted italic">{mensagemVazia}</p>
      ) : (
        <ul aria-label={titulo} className="flex flex-col gap-1">
          {vinculos.map((vinculo) => (
            <li
              key={vinculo.id}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-border px-3 py-1.5 text-sm text-ink"
            >
              <span className="flex min-w-0 flex-wrap items-center gap-2 [overflow-wrap:anywhere]">
                {vinculo.rotulo}
                {vinculo.desativado && (
                  <span className="rounded-[var(--radius-pill)] border border-border px-2 py-0.5 text-xs text-muted">
                    Removido
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onRemover(vinculo.id)}
                aria-label={`Remover vínculo com ${vinculo.nomeAcessivel}`}
                className="shrink-0 rounded p-1 text-muted hover:shadow-hover"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
