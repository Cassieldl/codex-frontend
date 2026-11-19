import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react'

import type { VizinhoDeCampo } from '../../types/vizinhoDeCampo'
import { BotaoCopiar } from './BotaoCopiar'
import { Modal } from './Modal'

export interface ModalDeCampoNavegavelProps {
  titulo: string
  /** Identifica o campo aberto: a troca zera o estado do conteúdo (ex.: "Copiado"). */
  chave: string
  /** Sobretítulo: "Serviço › Valores › IBSCBS". */
  trilha: string
  aposTitulo?: ReactNode
  /** 1-based na sequência visível. */
  posicao: number
  total: number
  /** Rodapé: "Campo N de M no filtro atual". */
  filtroAtivo: boolean
  anterior: VizinhoDeCampo | null
  proximo: VizinhoDeCampo | null
  onNavegar: (slug: string) => void
  onFechar: () => void
  /**
   * Dono único do foco de retorno. O `Modal` chama isto uma vez, depois de o diálogo sair do DOM,
   * e não devolve o foco ao elemento que o abriu.
   */
  devolverFoco: () => void
  /** Endereço absoluto que o botão "Copiar link do campo" copia. */
  linkDoCampo: string
  /** Atalhos fixos no rodapé, acima da posição na sequência. */
  acoesDoRodape?: ReactNode
  children: ReactNode
}

interface BotaoDeNavegacaoProps {
  sentido: 'anterior' | 'proximo'
  vizinho: VizinhoDeCampo | null
  onNavegar: (slug: string) => void
}

const CLASSES_DO_BOTAO_DE_NAVEGACAO =
  'inline-flex h-9 items-center gap-1 rounded-[var(--radius-control)] border border-border bg-white px-2.5 text-sm font-medium text-ink hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:shadow-none'

/**
 * Na ponta da sequência o botão fica `aria-disabled`, nunca `disabled`: um botão focado que vira
 * `disabled` joga o foco no `<body>`.
 */
function BotaoDeNavegacao({ sentido, vizinho, onNavegar }: BotaoDeNavegacaoProps) {
  const ehAnterior = sentido === 'anterior'
  const rotuloAcessivel = ehAnterior ? 'Campo anterior' : 'Próximo campo'

  return (
    <button
      type="button"
      aria-label={rotuloAcessivel}
      aria-disabled={vizinho === null ? true : undefined}
      title={vizinho ? `${rotuloAcessivel}: ${vizinho.nome}` : undefined}
      onClick={() => vizinho && onNavegar(vizinho.slug)}
      className={CLASSES_DO_BOTAO_DE_NAVEGACAO}
    >
      {ehAnterior && <ChevronLeft className="size-4" aria-hidden="true" />}
      <span className="hidden sm:inline">{ehAnterior ? 'Anterior' : 'Próximo'}</span>
      {!ehAnterior && <ChevronRight className="size-4" aria-hidden="true" />}
    </button>
  )
}

/**
 * Detalhe do campo em modal, com navegação pela sequência visível (botões e setas ←/→). O conteúdo
 * é de quem o usa: aqui moram a navegação, o link do campo e o rodapé.
 *
 * A troca de campo é anunciada por uma região viva, mas só depois da primeira troca: na abertura,
 * o nome do diálogo já cobre.
 */
export function ModalDeCampoNavegavel({
  titulo,
  chave,
  trilha,
  aposTitulo,
  posicao,
  total,
  filtroAtivo,
  anterior,
  proximo,
  onNavegar,
  onFechar,
  devolverFoco,
  linkDoCampo,
  acoesDoRodape,
  children,
}: ModalDeCampoNavegavelProps) {
  const [houveNavegacao, setHouveNavegacao] = useState(false)

  const navegar = useCallback(
    (slug: string) => {
      setHouveNavegacao(true)
      onNavegar(slug)
    },
    [onNavegar],
  )

  // `document`, e não o wrapper: com o foco no próprio diálogo, o alvo do evento é o pai do wrapper.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const comModificador = evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey
      if (evento.defaultPrevented || comModificador) return

      const destino =
        evento.key === 'ArrowLeft' ? anterior : evento.key === 'ArrowRight' ? proximo : null
      if (!destino) return

      evento.preventDefault()
      navegar(destino.slug)
    }

    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [anterior, proximo, navegar])

  return (
    <Modal
      isOpen
      onClose={onFechar}
      title={titulo}
      size="lg"
      variante="painel"
      focoInicial="dialogo"
      devolverFoco={devolverFoco}
      chaveDoConteudo={chave}
      sobretitulo={
        <p className="text-aux font-semibold tracking-wide text-muted uppercase">{trilha}</p>
      }
      aposTitulo={aposTitulo}
      acoesDoCabecalho={
        <>
          <BotaoDeNavegacao sentido="anterior" vizinho={anterior} onNavegar={navegar} />
          <BotaoDeNavegacao sentido="proximo" vizinho={proximo} onNavegar={navegar} />
          <BotaoCopiar
            compacto
            icone="link"
            rotulo="Copiar link do campo"
            ariaLabel={`Copiar link do campo ${titulo}`}
            valor={linkDoCampo}
          />
        </>
      }
      rodape={
        <div className="flex flex-col gap-2">
          {acoesDoRodape}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
            <p>
              Campo {posicao} de {total}
              {filtroAtivo && <span> no filtro atual</span>}
            </p>
            <p className="hidden sm:block">
              <kbd>←</kbd> <kbd>→</kbd> navegam · <kbd>Esc</kbd> fecha
            </p>
          </div>
        </div>
      }
    >
      {/* A chave remonta os botões de copiar e zera o "Copiado" a cada campo. */}
      <Fragment key={chave}>{children}</Fragment>

      <p role="status" aria-live="polite" data-anuncio-de-navegacao className="sr-only">
        {houveNavegacao ? `Campo ${posicao} de ${total}: ${titulo}` : ''}
      </p>
    </Modal>
  )
}
