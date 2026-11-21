import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { CLASSE_CARD } from './classesDeCard'
import { secaoDaAncora } from './secoesDoArtigo'

interface EstadoDoSeletor {
  indiceAtual: number
  idDoPainel: (indice: number) => string
}

const ContextoDoSeletor = createContext<EstadoDoSeletor | null>(null)

export interface SeletorDeSecoesProps {
  /** Rótulo da lista suspensa. */
  rotulo: string
  /** Título de cada seção, na ordem dos painéis. */
  secoes: readonly string[]
  temDica: boolean
  children: ReactNode
}

/**
 * Lista suspensa nativa que mostra uma seção por vez. Link com a âncora de uma seção escondida
 * (de outra página ou do próprio artigo) abre essa seção e rola até o bloco.
 */
export function SeletorDeSecoes({ rotulo, secoes, temDica, children }: SeletorDeSecoesProps) {
  const idBase = useId()
  const idDoSeletor = `${idBase}-seletor`
  const [indiceAtual, setIndiceAtual] = useState(0)
  const blocoRef = useRef<HTMLDivElement>(null)
  const rolarRef = useRef(false)
  const chave = secoes.join('|')

  useEffect(() => {
    const titulos = chave.split('|')

    function abrirPelaAncora() {
      const indice = secaoDaAncora(titulos, window.location.hash)
      if (indice < 0) return
      rolarRef.current = true
      setIndiceAtual(indice)
    }

    abrirPelaAncora()
    window.addEventListener('hashchange', abrirPelaAncora)
    return () => window.removeEventListener('hashchange', abrirPelaAncora)
  }, [chave])

  useEffect(() => {
    if (!rolarRef.current) return
    rolarRef.current = false
    blocoRef.current?.scrollIntoView?.({ block: 'start' })
  }, [indiceAtual])

  const idDoPainel = (indice: number) => `${idBase}-painel-${indice}`

  return (
    <ContextoDoSeletor.Provider value={{ indiceAtual, idDoPainel }}>
      <div
        ref={blocoRef}
        data-bloco="seletor"
        className={cn(CLASSE_CARD, 'grid scroll-mt-6 overflow-hidden md:grid-cols-2')}
      >
        <div
          className={cn(
            'flex flex-col gap-1 bg-surface-hover p-5',
            temDica ? 'md:pr-3' : 'md:col-span-2',
          )}
        >
          <label htmlFor={idDoSeletor} className="text-xs font-semibold text-ink">
            {rotulo}
          </label>
          <select
            id={idDoSeletor}
            value={indiceAtual}
            aria-controls={idDoPainel(indiceAtual)}
            onChange={(evento) => setIndiceAtual(Number(evento.target.value))}
            className="h-11 w-full rounded-[var(--radius-input)] border border-border-control bg-white px-3 text-sm font-semibold text-primary hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover"
          >
            {secoes.map((titulo, indice) => (
              <option key={titulo} value={indice}>
                {titulo}
              </option>
            ))}
          </select>
        </div>
        {children}
      </div>
    </ContextoDoSeletor.Provider>
  )
}

/** Texto ao lado da lista suspensa. */
export function DicaDoSeletor({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col justify-center gap-1 bg-surface-hover px-5 pb-5 text-sm text-muted md:pt-5 md:pl-3">
      {children}
    </div>
  )
}

export interface PainelDoSeletorProps {
  indice: number
  titulo: string
  children: ReactNode
}

/** Painel de uma seção: fora do seletor, fica sempre visível. */
export function PainelDoSeletor({ indice, titulo, children }: PainelDoSeletorProps) {
  const seletor = useContext(ContextoDoSeletor)
  const visivel = !seletor || seletor.indiceAtual === indice

  return (
    <section
      id={seletor?.idDoPainel(indice)}
      aria-label={titulo}
      hidden={!visivel}
      className="relative flex min-w-0 flex-col gap-4 border-t border-border p-5 md:col-span-2 [&>h3:first-child]:sr-only"
    >
      {children}
    </section>
  )
}
