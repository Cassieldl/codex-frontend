import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { descreverMudancasDoLayout, ID_NOVIDADES_DO_LAYOUT } from '../../../utils/mudancasDoLayout'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type { NovidadesVersaoLayout } from '../types/layoutPublico'
import { NotaDaVersao } from './NotaDaVersao'

export interface NovidadesDaVigenteProps {
  novidades: NovidadesVersaoLayout
}

/** O que a versão vigente mudou em relação à anterior. A Home aponta para cá pelo id `novidades`. */
export function NovidadesDaVigente({ novidades }: NovidadesDaVigenteProps) {
  const { versao, anterior } = novidades
  const secaoRef = useRef<HTMLElement>(null)

  // A seção nasce depois do fetch, quando o navegador já desistiu da âncora: rola por conta própria.
  useEffect(() => {
    if (window.location.hash !== `#${ID_NOVIDADES_DO_LAYOUT}`) return
    // O jsdom não implementa `scrollIntoView`; o navegador sempre tem.
    secaoRef.current?.scrollIntoView?.({ block: 'start' })
  }, [])

  const mudancas = descreverMudancasDoLayout(novidades.camposNovos, novidades.camposDescontinuados)

  const titulo = anterior
    ? `O que mudou da ${formatarVersaoLayout(anterior.rotulo)} para a ${versao.rotulo}`
    : `Sobre a ${formatarVersaoLayout(versao.rotulo)}`

  return (
    <section
      ref={secaoRef}
      id={ID_NOVIDADES_DO_LAYOUT}
      aria-labelledby="novidades-titulo"
      className="flex scroll-mt-6 flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="novidades-titulo" className="text-subtitulo font-semibold text-ink">
          {titulo}
        </h2>
        {mudancas && (
          <span className="rounded-[var(--radius-pill)] bg-accent px-3 py-0.5 text-xs font-bold text-primary">
            {mudancas}
          </span>
        )}
      </div>

      <NotaDaVersao descricao={novidades.descricao} />

      <Link
        to="/layout/$versaoSlug"
        params={{ versaoSlug: versao.slug }}
        activeOptions={{ exact: true }}
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary-medium hover:underline"
      >
        Abrir o dicionário da {formatarVersaoLayout(versao.rotulo)}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  )
}
