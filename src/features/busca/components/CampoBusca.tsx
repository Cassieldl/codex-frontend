import clsx from 'clsx'
import { Search } from 'lucide-react'
import { useId } from 'react'

export interface CampoBuscaProps {
  valor: string
  onValorChange: (valor: string) => void
  onSubmit?: () => void
  placeholder?: string
  autoFocus?: boolean
  variante?: 'padrao' | 'destaque'
  rotuloOculto?: string
}

const PLACEHOLDER_PADRAO = 'Busque pelo código do erro, a mensagem recebida ou o nome do provedor'

/**
 * Campo de busca reusado por `/` (§7.0) e `/busca` (§7.1) — controlado pelo
 * chamador (valor/onValorChange), que decide se sincroniza com a URL e/ou
 * aplica debounce. `role="searchbox"` para leitores de tela e navegação por
 * padrão de busca.
 */
export function CampoBusca({
  valor,
  onValorChange,
  onSubmit,
  placeholder = PLACEHOLDER_PADRAO,
  autoFocus = false,
  variante = 'padrao',
  rotuloOculto = 'Buscar no Codex',
}: CampoBuscaProps) {
  const inputId = useId()
  const destaque = variante === 'destaque'

  return (
    <form
      role="search"
      className="w-full"
      onSubmit={(evento) => {
        evento.preventDefault()
        onSubmit?.()
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {rotuloOculto}
      </label>

      {/* O input não desenha contorno próprio: o anel de foco fica na moldura inteira. */}
      <div
        className={clsx(
          'flex items-center gap-3 rounded-[var(--radius-input)] border bg-white px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-light',
          destaque ? 'h-14 border-transparent px-4 shadow-panel' : 'h-11 border-border',
        )}
      >
        <Search
          className={clsx('size-5 shrink-0', destaque ? 'text-primary-light' : 'text-muted')}
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="search"
          role="searchbox"
          value={valor}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- opcional por prop, ligado só onde digitar é a única tarefa
          autoFocus={autoFocus}
          onChange={(evento) => onValorChange(evento.target.value)}
          placeholder={placeholder}
          className={clsx(
            'h-full w-full border-none bg-transparent text-ink outline-none placeholder:text-muted',
            destaque ? 'text-card-titulo' : 'text-sm',
          )}
        />
        {destaque && (
          <kbd
            aria-hidden="true"
            className="hidden shrink-0 rounded-[var(--radius-check)] border border-border-control px-2 py-0.5 font-sans text-xs font-semibold text-muted sm:block"
          >
            Enter
          </kbd>
        )}
      </div>
    </form>
  )
}
