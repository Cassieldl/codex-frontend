import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type ModalSize = 'sm' | 'md' | 'lg'

type ModalBaseProps = {
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
  /** Onde o foco cai na abertura: no primeiro focável do conteúdo (padrão) ou no próprio diálogo. */
  focoInicial?: 'conteudo' | 'dialogo'
  /**
   * Dono do foco de retorno. Chamado uma vez, depois de o diálogo sair do DOM, e no lugar da
   * devolução ao elemento que abriu o modal.
   */
  devolverFoco?: () => void
  /**
   * Identifica o conteúdo exibido. Quando muda com o diálogo aberto, a rolagem volta ao topo e o
   * foco que ficou sem dono (conteúdo anterior desmontado) volta ao diálogo.
   */
  chaveDoConteudo?: string
}

type ModalPadraoProps = ModalBaseProps & {
  variante?: 'padrao'
  sobretitulo?: never
  aposTitulo?: never
  acoesDoCabecalho?: never
  rodape?: never
}

type ModalPainelProps = ModalBaseProps & {
  variante: 'painel'
  sobretitulo?: ReactNode
  aposTitulo?: ReactNode
  acoesDoCabecalho?: ReactNode
  rodape?: ReactNode
}

export type ModalProps = ModalPadraoProps | ModalPainelProps

const FOCAVEL_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
}

const overlayClasses = 'fixed inset-0 z-50 flex items-center justify-center'

const overlayPorVariante = {
  padrao: 'bg-ink/50 p-4',
  // Folha de baixo no celular; o desfoque é estático para respeitar `prefers-reduced-motion`.
  painel: 'bg-ink/40 backdrop-blur-[3px] p-4 max-[899px]:items-end max-[899px]:p-0',
}

const dialogoPorVariante = {
  padrao: 'px-7 py-5',
  // O próprio diálogo é a região rolável: com o foco nele, setas e PageDown rolam o conteúdo em vez
  // do documento de trás. Cabeçalho e rodapé são `sticky` dentro dele.
  painel:
    'overflow-y-auto overscroll-contain max-h-[min(86vh,900px)] transition-[opacity,translate] duration-200 starting:opacity-0 max-[899px]:max-h-[92dvh] max-[899px]:rounded-b-none max-[899px]:starting:translate-y-6 pb-[env(safe-area-inset-bottom)]',
}

export function Modal(props: ModalProps) {
  const {
    isOpen,
    onClose,
    title,
    size = 'md',
    titleVisuallyHidden = false,
    children,
    focoInicial = 'conteudo',
    devolverFoco,
    chaveDoConteudo,
  } = props
  const painel = props.variante === 'painel' ? props : null
  const variante = painel ? 'painel' : 'padrao'

  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const conteudoRef = useRef<HTMLDivElement>(null)
  const propsRecentesRef = useRef({ onClose, devolverFoco, focoInicial })
  const elementoAnteriorRef = useRef<HTMLElement | null>(null)
  const chaveAnteriorRef = useRef(chaveDoConteudo)

  // Os efeitos abaixo dependem só de `isOpen`; por aqui eles leem a versão mais recente dos
  // callbacks e da opção de foco, sem reabrir o ciclo de foco a cada render.
  useEffect(() => {
    propsRecentesRef.current = { onClose, devolverFoco, focoInicial }
  }, [onClose, devolverFoco, focoInicial])

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

    if (propsRecentesRef.current.focoInicial === 'dialogo') {
      dialogNode?.focus()
    } else {
      // Foco inicial prioriza o primeiro campo do conteúdo (children), não o
      // botão de fechar do cabeçalho — evita que "Esc"/leitura comecem no X.
      const primeiroFocavel =
        conteudoRef.current?.querySelector<HTMLElement>(FOCAVEL_SELECTOR) ??
        dialogNode?.querySelector<HTMLElement>(FOCAVEL_SELECTOR)
      ;(primeiroFocavel ?? dialogNode)?.focus()
    }

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        propsRecentesRef.current.onClose()
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
      const focoNoDialogo = document.activeElement === dialogNode

      // O nó do diálogo (`tabIndex=-1`) não está na lista de focáveis: sem tratá-lo, Shift+Tab a
      // partir dele escaparia da armadilha para a página de trás.
      if (evento.shiftKey && (focoNoDialogo || document.activeElement === primeiro)) {
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

      // O StrictMode simula uma desmontagem com o diálogo ainda no documento: não é fechamento.
      if (dialogNode?.isConnected) return

      const anterior = elementoAnteriorRef.current
      // Limpo aqui para que a próxima abertura volte a capturar o gatilho na renderização.
      elementoAnteriorRef.current = null

      const devolucaoPersonalizada = propsRecentesRef.current.devolverFoco
      if (devolucaoPersonalizada) {
        devolucaoPersonalizada()
        return
      }

      // Só devolve o foco se o gatilho ainda estiver no documento — `focus()` num nó desconectado
      // não lança, apenas joga o foco no `<body>`.
      if (anterior?.isConnected) anterior.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const chaveMudou = chaveAnteriorRef.current !== chaveDoConteudo
    chaveAnteriorRef.current = chaveDoConteudo
    if (!isOpen || !chaveMudou) return

    const dialogNode = dialogRef.current
    if (!dialogNode) return

    dialogNode.scrollTop = 0

    const focoAtual = document.activeElement
    if (!focoAtual || !dialogNode.contains(focoAtual)) dialogNode.focus({ preventScroll: true })
  }, [isOpen, chaveDoConteudo])

  if (!isOpen) return null

  const botaoFechar = (
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
  )

  const titulo = (
    <h2
      id={titleId}
      className={clsx(
        titleVisuallyHidden && 'sr-only',
        !titleVisuallyHidden &&
          (painel
            ? 'font-mono text-lg font-semibold text-ink [overflow-wrap:anywhere]'
            : 'text-[16px] font-medium text-ink'),
      )}
    >
      {title}
    </h2>
  )

  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- clique no fundo fecha; pelo teclado, o Escape já fecha
    <div
      className={clsx(overlayClasses, overlayPorVariante[variante])}
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
          'w-full rounded-[var(--radius-card)] bg-white shadow-panel focus:outline-none',
          dialogoPorVariante[variante],
          sizeClasses[size],
        )}
      >
        {painel ? (
          <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-line bg-white px-5 pt-5 pb-4 sm:px-6">
            <div className="min-w-0 flex-1">
              {painel.sobretitulo}
              {titulo}
              {painel.aposTitulo}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {painel.acoesDoCabecalho}
              {botaoFechar}
            </div>
          </div>
        ) : (
          <div
            className={clsx(
              'mb-4 flex items-center gap-4',
              titleVisuallyHidden ? 'justify-end' : 'justify-between',
            )}
          >
            {titulo}
            {botaoFechar}
          </div>
        )}

        <div ref={conteudoRef} className={painel ? 'px-5 py-5 sm:px-6' : undefined}>
          {children}
        </div>

        {painel?.rodape && (
          <div className="sticky bottom-0 z-10 border-t border-line bg-white px-5 py-2.5 sm:px-6">
            {painel.rodape}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
