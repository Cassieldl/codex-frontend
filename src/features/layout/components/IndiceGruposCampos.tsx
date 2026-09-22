import clsx from 'clsx'
import { useEffect, useState } from 'react'

export interface GrupoIndiceCampos {
  slug: string
  nome: string
  total: number
}

export interface IndiceGruposCamposProps {
  /** Memoizar no chamador: a lista é dependência do observador de rolagem. */
  grupos: GrupoIndiceCampos[]
}

const PREFIXO_ID_GRUPO = 'grupo-'

/**
 * Índice lateral dos grupos do dicionário (a escala da tela — dezenas de
 * verbetes — torna a rolagem de retorno cara). O item ativo acompanha a
 * rolagem via `IntersectionObserver` e é marcado com `aria-current="true"`:
 * **nunca** só pela cor de fundo do link.
 */
export function IndiceGruposCampos({ grupos }: IndiceGruposCamposProps) {
  const [slugAtivo, setSlugAtivo] = useState<string | null>(grupos[0]?.slug ?? null)

  useEffect(() => {
    setSlugAtivo(grupos[0]?.slug ?? null)

    if (typeof IntersectionObserver === 'undefined') return

    const observador = new IntersectionObserver(
      (entradas) => {
        const primeiraVisivel = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]

        if (primeiraVisivel) {
          setSlugAtivo(primeiraVisivel.target.id.slice(PREFIXO_ID_GRUPO.length))
        }
      },
      { rootMargin: '0px 0px -60% 0px' },
    )

    for (const grupo of grupos) {
      const elemento = document.getElementById(`${PREFIXO_ID_GRUPO}${grupo.slug}`)
      if (elemento) observador.observe(elemento)
    }

    return () => observador.disconnect()
  }, [grupos])

  if (grupos.length === 0) return null

  return (
    <nav aria-label="Grupos de campo" className="flex flex-col gap-1">
      <h2 className="mb-1 text-aux font-semibold tracking-wide text-ink/70 uppercase">
        Grupos de campo
      </h2>
      {grupos.map((grupo) => {
        const ativo = grupo.slug === slugAtivo

        return (
          <a
            key={grupo.slug}
            href={`#${PREFIXO_ID_GRUPO}${grupo.slug}`}
            aria-current={ativo ? 'true' : undefined}
            className={clsx(
              'flex items-baseline justify-between gap-2 rounded-[var(--radius-control)] border-b border-line px-2 py-1.5 text-sm font-medium text-primary-medium no-underline hover:shadow-hover',
              ativo && 'bg-surface-hover font-semibold',
            )}
          >
            <span>{grupo.nome}</span>
            <span className="text-aux text-ink/60 tabular-nums">{grupo.total}</span>
          </a>
        )
      })}
    </nav>
  )
}
