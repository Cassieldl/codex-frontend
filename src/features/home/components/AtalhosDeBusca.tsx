import { Link } from '@tanstack/react-router'
import clsx from 'clsx'

interface Atalho {
  termo: string
  /** Código e nome de campo em fonte mono, como aparecem no XML. */
  ehCodigo: boolean
}

const ATALHOS: readonly Atalho[] = [
  { termo: 'E0038', ehCodigo: true },
  { termo: 'TomaCNPJ', ehCodigo: true },
  { termo: 'ISS.NET', ehCodigo: false },
  { termo: 'município emissor', ehCodigo: false },
]

/** Exemplos de busca abaixo do campo do hero: mostram o que dá para colar ali. */
export function AtalhosDeBusca() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-white">Experimente:</span>
      {ATALHOS.map((atalho) => (
        <Link
          key={atalho.termo}
          to="/busca"
          search={{ q: atalho.termo }}
          className={clsx(
            'rounded-[var(--radius-pill)] border border-white/40 px-3 py-1.5 text-xs text-white transition-colors duration-150 hover:border-white',
            atalho.ehCodigo ? 'font-mono' : 'font-semibold',
          )}
        >
          {atalho.termo}
        </Link>
      ))}
    </div>
  )
}
