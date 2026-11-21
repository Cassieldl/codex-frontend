import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../../../lib/cn'

export interface AbaFormulario {
  /** Identificador estável da aba - vira parte do `id` do tab e do painel. */
  valor: string
  rotulo: string
  conteudo: ReactNode
}

export interface AbasFormularioProps {
  abas: AbaFormulario[]
  valorAtivo: string
  onValorAtivoChange: (valor: string) => void
  /** Nomeia o conjunto para leitor de tela (ex.: "Corpo do artigo"). */
  ariaLabel: string
  className?: string
}

/**
 * Abas de verdade do ARIA Tabs Pattern - `role="tablist"`/`"tab"`/`"tabpanel"`,
 * seta esquerda/direita circulando, `Home`/`End`, e foco móvel (só a aba ativa
 * é tabulável).
 *
 * **Não** é o `AbasNavegaveis` de `components/ui/`: lá cada aba é uma URL de
 * verdade (`<Link>`), o que é certo para filtro de página e errado aqui -
 * alternar "Editar"/"Pré-visualizar" troca de painel dentro do mesmo
 * formulário, sem navegar. Trocar a URL no meio de um formulário preenchido
 * mudaria o significado do botão "voltar" do navegador.
 */
export function AbasFormulario({
  abas,
  valorAtivo,
  onValorAtivoChange,
  ariaLabel,
  className,
}: AbasFormularioProps) {
  const idBase = useId()
  const refsDasAbas = useRef<Record<string, HTMLButtonElement | null>>({})

  const indiceAtivo = Math.max(
    0,
    abas.findIndex((aba) => aba.valor === valorAtivo),
  )

  function idDaAba(valor: string) {
    return `${idBase}-aba-${valor}`
  }

  function idDoPainel(valor: string) {
    return `${idBase}-painel-${valor}`
  }

  function focarAba(indice: number) {
    const destino = abas[indice]
    if (!destino) return
    onValorAtivoChange(destino.valor)
    refsDasAbas.current[destino.valor]?.focus()
  }

  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>) {
    switch (evento.key) {
      case 'ArrowRight':
        evento.preventDefault()
        focarAba((indiceAtivo + 1) % abas.length)
        break
      case 'ArrowLeft':
        evento.preventDefault()
        focarAba((indiceAtivo - 1 + abas.length) % abas.length)
        break
      case 'Home':
        evento.preventDefault()
        focarAba(0)
        break
      case 'End':
        evento.preventDefault()
        focarAba(abas.length - 1)
        break
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex items-center gap-1 border-b border-border"
      >
        {abas.map((aba) => {
          const ativa = aba.valor === valorAtivo
          return (
            <button
              key={aba.valor}
              ref={(elemento) => {
                refsDasAbas.current[aba.valor] = elemento
              }}
              type="button"
              role="tab"
              id={idDaAba(aba.valor)}
              aria-selected={ativa}
              aria-controls={idDoPainel(aba.valor)}
              tabIndex={ativa ? 0 : -1}
              onClick={() => onValorAtivoChange(aba.valor)}
              onKeyDown={aoTeclar}
              className={cn(
                'inline-flex items-center border-b-[3px] px-3 py-2 text-sm transition-shadow duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover',
                ativa
                  ? 'border-accent-hover font-semibold text-ink'
                  : 'border-transparent font-normal text-muted hover:shadow-hover',
              )}
            >
              {aba.rotulo}
            </button>
          )
        })}
      </div>

      {abas.map((aba) => (
        <div
          key={aba.valor}
          role="tabpanel"
          id={idDoPainel(aba.valor)}
          aria-labelledby={idDaAba(aba.valor)}
          hidden={aba.valor !== valorAtivo}
          tabIndex={0}
        >
          {/* O painel inativo continua montado (`hidden`) de propósito: o
              textarea de edição não pode perder o que foi digitado quando o
              editor espia a pré-visualização. */}
          {aba.conteudo}
        </div>
      ))}
    </div>
  )
}
