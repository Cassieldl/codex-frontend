import { Loader2, MoreHorizontal } from 'lucide-react'
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

/** Distância entre o botão e o menu, e respiro mínimo até a borda da janela. */
const AFASTAMENTO = 4

interface PosicaoDoMenu {
  top: number
  right: number
}

interface ContextoDoMenu {
  fecharEDevolverFoco: () => void
}

const MenuContexto = createContext<ContextoDoMenu | null>(null)

function itensDoMenu(menu: HTMLElement | null): HTMLElement[] {
  return Array.from(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
}

export interface MenuDeAcoesProps {
  /** Nome do botão, dizendo de qual linha são as ações: "Mais ações do erro E0117". */
  rotulo: string
  children: ReactNode
  /** Ação do menu em andamento: o botão vira indicador de carga e fica desabilitado. */
  isLoading?: boolean
  className?: string
}

/**
 * Ações secundárias de uma linha (despublicar, remover), fora da vista até o clique. Padrão de
 * menu da APG: setas, Home e End percorrem os itens; Esc e Tab fecham e devolvem o foco ao botão.
 * O menu vai para o `body` porque a tabela rola na horizontal e cortaria um menu posicionado
 * dentro dela.
 */
export function MenuDeAcoes({ rotulo, children, isLoading = false, className }: MenuDeAcoesProps) {
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState<PosicaoDoMenu>({ top: 0, right: 0 })
  const focoInicialRef = useRef<'primeiro' | 'ultimo'>('primeiro')
  const botaoRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  function abrir(focoInicial: 'primeiro' | 'ultimo') {
    focoInicialRef.current = focoInicial
    setAberto(true)
  }

  function fecharEDevolverFoco() {
    setAberto(false)
    botaoRef.current?.focus()
  }

  // Mede antes de pintar: abre embaixo do botão e sobe quando não cabe até o fim da janela.
  useLayoutEffect(() => {
    if (!aberto || !botaoRef.current) return

    const caixaDoBotao = botaoRef.current.getBoundingClientRect()
    const alturaDoMenu = menuRef.current?.offsetHeight ?? 0
    const cabeEmbaixo =
      caixaDoBotao.bottom + AFASTAMENTO + alturaDoMenu <= window.innerHeight - AFASTAMENTO

    setPosicao({
      top: cabeEmbaixo
        ? caixaDoBotao.bottom + AFASTAMENTO
        : Math.max(AFASTAMENTO, caixaDoBotao.top - AFASTAMENTO - alturaDoMenu),
      right: Math.max(AFASTAMENTO, window.innerWidth - caixaDoBotao.right),
    })

    const itens = itensDoMenu(menuRef.current)
    const alvo = focoInicialRef.current === 'ultimo' ? itens[itens.length - 1] : itens[0]
    alvo?.focus()
  }, [aberto])

  useEffect(() => {
    if (!aberto) return

    function aoPressionarFora(evento: MouseEvent) {
      const alvo = evento.target as Node
      if (menuRef.current?.contains(alvo) || botaoRef.current?.contains(alvo)) return
      setAberto(false)
    }

    // Posição fixa calculada uma vez: rolar ou redimensionar deixaria o menu solto da linha.
    function aoMoverJanela() {
      setAberto(false)
    }

    document.addEventListener('mousedown', aoPressionarFora)
    window.addEventListener('scroll', aoMoverJanela, true)
    window.addEventListener('resize', aoMoverJanela)
    return () => {
      document.removeEventListener('mousedown', aoPressionarFora)
      window.removeEventListener('scroll', aoMoverJanela, true)
      window.removeEventListener('resize', aoMoverJanela)
    }
  }, [aberto])

  function aoTeclarNoBotao(evento: KeyboardEvent<HTMLButtonElement>) {
    if (isLoading) return
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      abrir('primeiro')
    }
    if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      abrir('ultimo')
    }
  }

  function aoTeclarNoMenu(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape' || evento.key === 'Tab') {
      evento.preventDefault()
      fecharEDevolverFoco()
      return
    }

    const itens = itensDoMenu(menuRef.current)
    if (itens.length === 0) return

    const atual = itens.indexOf(document.activeElement as HTMLElement)
    const destinos: Record<string, number> = {
      ArrowDown: (atual + 1) % itens.length,
      ArrowUp: (atual - 1 + itens.length) % itens.length,
      Home: 0,
      End: itens.length - 1,
    }
    const destino = destinos[evento.key]
    if (destino === undefined) return

    evento.preventDefault()
    itens[destino]?.focus()
  }

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        aria-label={rotulo}
        title={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? menuId : undefined}
        // Ocupado sem `disabled`: botão desabilitado perde o foco, e quem despublicou pelo teclado
        // cairia no body.
        aria-disabled={isLoading || undefined}
        aria-busy={isLoading || undefined}
        onClick={() => {
          if (isLoading) return
          if (aberto) setAberto(false)
          else abrir('primeiro')
        }}
        onKeyDown={aoTeclarNoBotao}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-[var(--radius-control)] border border-border bg-white text-ink transition-shadow duration-150 hover:border-primary-light hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover aria-disabled:cursor-not-allowed aria-disabled:bg-surface-disabled aria-disabled:text-muted',
          className,
        )}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <MoreHorizontal className="size-4" aria-hidden="true" />
        )}
      </button>

      {aberto &&
        createPortal(
          <MenuContexto.Provider value={{ fecharEDevolverFoco }}>
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={rotulo}
              tabIndex={-1}
              onKeyDown={aoTeclarNoMenu}
              style={{ top: posicao.top, right: posicao.right }}
              className="fixed z-40 flex min-w-44 flex-col rounded-[var(--radius-control)] border border-border bg-white py-1 shadow-panel"
            >
              {children}
            </div>
          </MenuContexto.Provider>,
          document.body,
        )}
    </>
  )
}

export interface ItemDoMenuDeAcoesProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'role' | 'onClick' | 'disabled'
> {
  children: ReactNode
  onSelecionar: () => void
  /** Ação que tira conteúdo do ar ou apaga: texto em vermelho. */
  destrutivo?: boolean
  /** Quando presente, o item fica indisponível e mostra o motivo logo abaixo do rótulo. */
  motivoIndisponivel?: string
}

/** Item do `MenuDeAcoes`. Fecha o menu e devolve o foco ao botão antes de executar a ação. */
export function ItemDoMenuDeAcoes({
  children,
  onSelecionar,
  destrutivo = false,
  motivoIndisponivel,
  className,
  ...props
}: ItemDoMenuDeAcoesProps) {
  const contexto = useContext(MenuContexto)
  const motivoId = useId()
  const indisponivel = Boolean(motivoIndisponivel)

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={indisponivel || undefined}
      aria-describedby={indisponivel ? motivoId : undefined}
      onClick={() => {
        if (indisponivel) return
        // O foco volta ao botão do menu antes: um diálogo aberto pela ação o devolve para lá.
        contexto?.fecharEDevolverFoco()
        onSelecionar()
      }}
      className={cn(
        'flex flex-col items-start px-3 py-2 text-left text-sm font-medium focus-visible:bg-surface-hover',
        indisponivel ? 'cursor-not-allowed text-muted' : 'hover:bg-surface-hover',
        destrutivo && !indisponivel ? 'text-error-texto' : !indisponivel && 'text-ink',
        className,
      )}
      {...props}
    >
      {children}
      {indisponivel && (
        <span id={motivoId} className="text-xs font-normal text-muted">
          {motivoIndisponivel}
        </span>
      )}
    </button>
  )
}
