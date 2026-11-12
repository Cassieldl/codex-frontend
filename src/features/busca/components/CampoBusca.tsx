import clsx from 'clsx'
import { Search } from 'lucide-react'
import { useId, type Ref } from 'react'

export type VarianteCampoBusca = 'padrao' | 'destaque' | 'compacta'

export interface CampoBuscaProps {
  valor: string
  onValorChange: (valor: string) => void
  onSubmit?: () => void
  placeholder?: string
  autoFocus?: boolean
  /** `compacta` é a do cabeçalho escuro das páginas internas. */
  variante?: VarianteCampoBusca
  rotuloOculto?: string
  campoRef?: Ref<HTMLInputElement>
  /** Tecla que foca o campo: vira dica visual e `aria-keyshortcuts`. Quem escuta a tecla é o chamador. */
  atalhoTeclado?: string
}

const PLACEHOLDER_PADRAO = 'Busque pelo código do erro, a mensagem recebida ou o nome do provedor'

const CLASSE_MOLDURA: Record<VarianteCampoBusca, string> = {
  padrao: 'h-11 border-border focus-within:outline-primary-light',
  destaque: 'h-14 border-transparent px-4 shadow-panel focus-within:outline-primary-light',
  // Sobre o azul-profundo o anel azul-claro mal aparece: o anel branco marca o foco.
  compacta: 'h-10 border-transparent focus-within:outline-white',
}

const CLASSE_KBD =
  'hidden shrink-0 rounded-[var(--radius-check)] border border-border-control px-2 py-0.5 font-sans text-xs font-semibold text-muted sm:block'

/**
 * Campo de busca reusado por `/` (§7.0), `/busca` (§7.1) e o cabeçalho das demais páginas,
 * controlado pelo chamador (valor/onValorChange), que decide se sincroniza com a URL e/ou aplica
 * debounce. `role="searchbox"` para leitores de tela e navegação por padrão de busca.
 */
export function CampoBusca({
  valor,
  onValorChange,
  onSubmit,
  placeholder = PLACEHOLDER_PADRAO,
  autoFocus = false,
  variante = 'padrao',
  rotuloOculto = 'Buscar no Codex',
  campoRef,
  atalhoTeclado,
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
          'flex items-center gap-3 rounded-[var(--radius-input)] border bg-white px-3 focus-within:outline-2 focus-within:outline-offset-2',
          CLASSE_MOLDURA[variante],
        )}
      >
        <Search
          className={clsx('size-5 shrink-0', destaque ? 'text-primary-light' : 'text-muted')}
          aria-hidden="true"
        />
        <input
          ref={campoRef}
          id={inputId}
          type="search"
          role="searchbox"
          value={valor}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- opcional por prop, ligado só onde digitar é a única tarefa
          autoFocus={autoFocus}
          aria-keyshortcuts={atalhoTeclado}
          onChange={(evento) => onValorChange(evento.target.value)}
          placeholder={placeholder}
          className={clsx(
            'h-full w-full min-w-0 border-none bg-transparent text-ink outline-none placeholder:text-muted',
            destaque ? 'text-card-titulo' : 'text-sm',
          )}
        />
        {destaque && (
          <kbd aria-hidden="true" className={CLASSE_KBD}>
            Enter
          </kbd>
        )}
        {atalhoTeclado && (
          <kbd aria-hidden="true" className={CLASSE_KBD}>
            {atalhoTeclado}
          </kbd>
        )}
      </div>
    </form>
  )
}
