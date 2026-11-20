import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'

export interface SelectOption {
  value: string
  label: string
}

/**
 * Superfície onde o campo é desenhado. Só o rótulo e os textos auxiliares mudam de cor - o
 * controle em si mantém fundo claro nas duas, porque é um campo de formulário.
 */
export type SelectSuperficie = 'clara' | 'escura'

export interface SelectProps {
  label: string
  options: SelectOption[]
  value: string | null
  onValueChange: (value: string) => void
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  id?: string
  disabled?: boolean
  className?: string
  superficie?: SelectSuperficie
}

/** Combobox custom (`role="listbox"`) - seguindo `analise-frontend.md` §4. */
export function Select({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Selecione…',
  hint,
  error,
  required = false,
  id,
  disabled = false,
  className,
  superficie = 'clara',
}: SelectProps) {
  const idGerado = useId()
  const selectId = id ?? idGerado
  const listboxId = `${selectId}-listbox`
  const hintId = `${selectId}-hint`
  const errorId = `${selectId}-error`

  const [aberto, setAberto] = useState(false)
  const [indiceAtivo, setIndiceAtivo] = useState(0)
  const botaoRef = useRef<HTMLButtonElement>(null)

  const opcaoSelecionada = options.find((opcao) => opcao.value === value) ?? null

  /** Id do `<li role="option">` - alvo do `aria-activedescendant` (padrão APG). */
  function idDaOpcao(indice: number) {
    return `${listboxId}-opcao-${indice}`
  }

  // Só existe opção ativa com a lista aberta. Fechada (ou sem options), o
  // atributo fica AUSENTE - nunca vazio nem apontando para id inexistente.
  const opcaoAtiva = aberto ? (options[indiceAtivo] ?? null) : null
  const idOpcaoAtiva = opcaoAtiva ? idDaOpcao(indiceAtivo) : undefined

  function abrir() {
    if (disabled) return
    const indiceAtual = options.findIndex((opcao) => opcao.value === value)
    setIndiceAtivo(indiceAtual >= 0 ? indiceAtual : 0)
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
  }

  function selecionar(opcao: SelectOption) {
    onValueChange(opcao.value)
    fechar()
    botaoRef.current?.focus()
  }

  function aoTeclarBotao(evento: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    switch (evento.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        evento.preventDefault()
        if (!aberto) {
          abrir()
        } else {
          setIndiceAtivo((indiceAnterior) => {
            const direcao = evento.key === 'ArrowDown' ? 1 : -1
            const proximo = (indiceAnterior + direcao + options.length) % options.length
            return proximo
          })
        }
        break
      case 'Home':
      case 'End':
        // Com a lista fechada, Home e End ficam com o navegador.
        if (!aberto || options.length === 0) break
        evento.preventDefault()
        setIndiceAtivo(evento.key === 'Home' ? 0 : options.length - 1)
        break
      case 'Enter':
      case ' ':
        evento.preventDefault()
        if (!aberto) {
          abrir()
        } else if (options[indiceAtivo]) {
          selecionar(options[indiceAtivo])
        }
        break
      case 'Escape':
        if (aberto) {
          evento.preventDefault()
          // Sem parar a propagação, o mesmo Escape chega ao ouvinte de `document` do Modal e
          // fecha o formulário inteiro junto com a lista - descartando o que já foi digitado.
          // O padrão ARIA manda Escape fechar só o popover do topo.
          evento.stopPropagation()
          fechar()
        }
        break
      case 'Tab':
        fechar()
        break
    }
  }

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={clsx('relative flex flex-col gap-0.5', className)}>
      <label
        htmlFor={selectId}
        className={clsx(
          'text-xs font-normal lg:text-sm',
          superficie === 'escura' ? 'text-white' : 'text-ink',
        )}
      >
        {required && (
          <span aria-hidden="true" className="text-error-texto">
            *{' '}
          </span>
        )}
        {label}
        {required && <span className="sr-only"> (obrigatório)</span>}
      </label>

      <button
        ref={botaoRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? listboxId : undefined}
        aria-activedescendant={idOpcaoAtiva}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        disabled={disabled}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={aoTeclarBotao}
        onBlur={fechar}
        className={clsx(
          // O fundo é explícito para o controle continuar legível sobre qualquer superfície -
          // sem ele, o texto escuro fica invisível dentro do cabeçalho em gradiente.
          'flex h-9 items-center justify-between rounded-[var(--radius-control)] border bg-white px-3 text-sm text-ink',
          'focus:outline-none focus:border-[1.5px] focus:border-primary-medium disabled:bg-surface-disabled disabled:text-muted',
          error ? 'border-error' : 'border-border-control',
        )}
      >
        <span className={opcaoSelecionada ? '' : 'text-muted'}>
          {opcaoSelecionada?.label ?? placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </button>

      {aberto && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute top-full z-10 mt-1 max-h-60 w-full overflow-auto rounded-[var(--radius-control)] border border-border bg-white shadow-panel"
        >
          {options.map((opcao, indice) => (
            <li
              key={opcao.value}
              id={idDaOpcao(indice)}
              role="option"
              aria-selected={opcao.value === value}
              onMouseDown={(evento) => {
                evento.preventDefault()
                selecionar(opcao)
              }}
              onMouseEnter={() => setIndiceAtivo(indice)}
              className={clsx(
                'cursor-pointer px-3 py-2 text-sm',
                indice === indiceAtivo ? 'bg-surface-hover' : '',
                opcao.value === value ? 'font-semibold text-ink' : 'text-ink',
              )}
            >
              {opcao.label}
            </li>
          ))}
        </ul>
      )}

      {hint && !error && (
        <p
          id={hintId}
          className={clsx('text-xs', superficie === 'escura' ? 'text-white' : 'text-muted')}
        >
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-error-texto">
          {error}
        </p>
      )}
    </div>
  )
}
