import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type ModalSize = 'sm' | 'md' | 'lg'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  size?: ModalSize
  /**
   * Mantém o título só para leitor de tela (`sr-only`), preservando o
   * `aria-labelledby` do diálogo. Usado pela barra de comando, onde o campo de
   * busca ocupa o lugar do cabeçalho — trocar o título por `aria-label` deixaria
   * o diálogo sem nome visível E sem nó de título, e é o mesmo nome que já
   * existe aqui.
   */
  titleVisuallyHidden?: boolean
  children?: ReactNode
}

const FOCAVEL_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  titleVisuallyHidden = false,
  children,
}: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const conteudoRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const elementoAnteriorRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Capturado durante a RENDERIZAÇÃO, não no efeito: `autoFocus` no conteúdo é aplicado por React
  // na fase de commit, que acontece antes dos efeitos — guardar aqui dentro do `useEffect` já
  // pegaria um nó do próprio diálogo, e ao fechar o foco cairia no `<body>` em silêncio. O item
  // "foco volta ao gatilho" do checklist de acessibilidade depende disto.
  if (isOpen && elementoAnteriorRef.current === null) {
    elementoAnteriorRef.current = document.activeElement as HTMLElement | null
  }

  useEffect(() => {
    if (!isOpen) return

    const dialogNode = dialogRef.current
    // Foco inicial prioriza o primeiro campo do conteúdo (children), não o
    // botão de fechar do cabeçalho — evita que "Esc"/leitura comecem no X.
    const primeiroFocavel =
      conteudoRef.current?.querySelector<HTMLElement>(FOCAVEL_SELECTOR) ??
      dialogNode?.querySelector<HTMLElement>(FOCAVEL_SELECTOR)
    ;(primeiroFocavel ?? dialogNode)?.focus()

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        onCloseRef.current()
        return
      }

      if (evento.key !== 'Tab' || !dialogNode) return

      const focaveis = Array.from(dialogNode.querySelectorAll<HTMLElement>(FOCAVEL_SELECTOR))
      if (focaveis.length === 0) {
        evento.preventDefault()
        return
      }

      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)

      // Só devolve o foco se o gatilho ainda estiver no documento — `focus()` num nó desconectado
      // não lança, apenas joga o foco no `<body>`. O ref é limpo aqui para que a próxima abertura
      // volte a capturar o gatilho na renderização.
      const anterior = elementoAnteriorRef.current
      elementoAnteriorRef.current = null
      if (anterior?.isConnected) anterior.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          'w-full rounded-[var(--radius-card)] bg-white px-7 py-5 shadow-panel focus:outline-none',
          sizeClasses[size],
        )}
      >
        <div
          className={clsx(
            'mb-4 flex items-center gap-4',
            titleVisuallyHidden ? 'justify-end' : 'justify-between',
          )}
        >
          <h2
            id={titleId}
            className={titleVisuallyHidden ? 'sr-only' : 'text-[16px] font-medium text-ink'}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className={clsx(
              // Caixa visual pequena (p-1), mas alvo de toque 44×44 via ::after
              // com preenchimento invisível — mesmo padrão de `BotaoCopiar`.
              "relative rounded p-1 text-ink after:absolute after:top-1/2 after:left-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
              'hover:shadow-hover',
            )}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div ref={conteudoRef}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
