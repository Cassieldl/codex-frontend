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

      <div
        className={clsx(
          'flex h-11 items-center gap-2 rounded-[var(--radius-input)] border bg-white px-3',
          variante === 'destaque' ? 'border-transparent' : 'border-border',
        )}
      >
        <Search className="size-5 shrink-0 text-muted" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          role="searchbox"
          value={valor}
          autoFocus={autoFocus}
          onChange={(evento) => onValorChange(evento.target.value)}
          placeholder={placeholder}
          className="h-full w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
        />
      </div>
    </form>
  )
}
