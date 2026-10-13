import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { EtiquetaEstado } from '../../../components/ui/EtiquetaEstado'
import { Modal } from '../../../components/ui/Modal'
import type { ModalDoCampoProps, VizinhoDoCampo } from '../types/modalDoCampo'
import { ESTADO_PARA_ETIQUETA } from '../utils/blocosDeCampos'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import { ConteudoDoCampo } from './ConteudoDoCampo'
import { ID_SECAO_REJEICOES } from './RejeicoesDoCampo'

interface BotaoDeNavegacaoProps {
  sentido: 'anterior' | 'proximo'
  vizinho: VizinhoDoCampo | null
  onNavegar: (campoLayoutSlug: string) => void
}

const CLASSES_DO_BOTAO_DE_NAVEGACAO =
  'inline-flex h-9 items-center gap-1 rounded-[var(--radius-control)] border border-border bg-white px-2.5 text-sm font-medium text-ink hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:shadow-none'

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
      onClick={() => vizinho && onNavegar(vizinho.campoLayoutSlug)}
      className={CLASSES_DO_BOTAO_DE_NAVEGACAO}
    >
      {ehAnterior && <ChevronLeft className="size-4" aria-hidden="true" />}
      <span className="hidden sm:inline">{ehAnterior ? 'Anterior' : 'Próximo'}</span>
      {!ehAnterior && <ChevronRight className="size-4" aria-hidden="true" />}
    </button>
  )
}

/**
 * Detalhe do campo em modal, com navegação pela sequência visível (botões e setas ←/→).
 *
 * O foco de retorno é do `devolverFoco`; o modal só o repassa. A troca de campo é anunciada por uma
 * região viva, mas só depois da primeira troca: na abertura, o nome do diálogo já cobre.
 */
export function ModalDoCampo({
  campo,
  trilha,
  posicao,
  total,
  filtroAtivo,
  anterior,
  proximo,
  secaoInicial,
  onNavegar,
  onFechar,
  devolverFoco,
  errosResumo,
  urlVersaoAbsoluta,
}: ModalDoCampoProps) {
  const [houveNavegacao, setHouveNavegacao] = useState(false)
  const secaoInicialRef = useRef(secaoInicial)

  const navegar = useCallback(
    (campoLayoutSlug: string) => {
      setHouveNavegacao(true)
      onNavegar(campoLayoutSlug)
    },
    [onNavegar],
  )

  // Só na abertura: navegar entre campos volta sempre ao topo.
  useEffect(() => {
    if (secaoInicialRef.current !== 'rejeicoes') return
    document.getElementById(ID_SECAO_REJEICOES)?.scrollIntoView({ block: 'start' })
  }, [])

  // `document`, e não o wrapper: com o foco no próprio diálogo, o alvo do evento é o pai do wrapper.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const comModificador = evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey
      if (evento.defaultPrevented || comModificador) return

      const destino =
        evento.key === 'ArrowLeft' ? anterior : evento.key === 'ArrowRight' ? proximo : null
      if (!destino) return

      evento.preventDefault()
      navegar(destino.campoLayoutSlug)
    }

    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [anterior, proximo, navegar])

  return (
    <Modal
      isOpen
      onClose={onFechar}
      title={campo.nome}
      size="lg"
      variante="painel"
      focoInicial="dialogo"
      devolverFoco={devolverFoco}
      chaveDoConteudo={campo.campoLayoutSlug}
      sobretitulo={
        <p className="text-aux font-semibold tracking-wide text-muted uppercase">{trilha}</p>
      }
      aposTitulo={
        <EtiquetaEstado estado={ESTADO_PARA_ETIQUETA[campo.estadoPreenchimento]} className="mt-2" />
      }
      acoesDoCabecalho={
        <>
          <BotaoDeNavegacao sentido="anterior" vizinho={anterior} onNavegar={navegar} />
          <BotaoDeNavegacao sentido="proximo" vizinho={proximo} onNavegar={navegar} />
          <BotaoCopiar
            compacto
            icone="link"
            rotulo="Copiar link do campo"
            ariaLabel={`Copiar link do campo ${campo.nome}`}
            valor={`${urlVersaoAbsoluta}#${construirIdLinhaCampo(campo.campoLayoutSlug)}`}
          />
        </>
      }
      rodape={
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
          <p>
            Campo {posicao} de {total}
            {filtroAtivo && <span> no filtro atual</span>}
          </p>
          <p className="hidden sm:block">
            <kbd>←</kbd> <kbd>→</kbd> navegam · <kbd>Esc</kbd> fecha
          </p>
        </div>
      }
    >
      {/* A chave remonta os botões de copiar e zera o "Copiado" a cada campo. */}
      <ConteudoDoCampo key={campo.campoLayoutSlug} campo={campo} errosResumo={errosResumo} />

      <p role="status" aria-live="polite" data-anuncio-de-navegacao className="sr-only">
        {houveNavegacao ? `Campo ${posicao} de ${total}: ${campo.nome}` : ''}
      </p>
    </Modal>
  )
}
