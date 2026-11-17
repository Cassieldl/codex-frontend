import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { ID_NOVIDADES_DO_LAYOUT } from '../../../utils/mudancasDoLayout'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import { useLayoutVersao } from '../hooks/useLayoutVersao'
import type { NovidadesVersaoLayout } from '../types/layoutPublico'
import { contarMudancasDaVersao } from '../utils/mudancasDaVersao'
import { ContadoresDeMudanca } from './ContadoresDeMudanca'
import { ListaDeMudancas } from './ListaDeMudancas'
import { NotaDaVersao } from './NotaDaVersao'

export interface NovidadesDaVigenteProps {
  novidades: NovidadesVersaoLayout
}

/**
 * O que a versão vigente mudou em relação à anterior, agrupado em "antes, seta, depois". Sem
 * mudanças estruturadas, a nota em texto. A Home aponta para cá pelo id `novidades`. A origem
 * normativa fica só na linha do tempo, logo acima.
 */
export function NovidadesDaVigente({ novidades }: NovidadesDaVigenteProps) {
  const { versao, anterior } = novidades
  const secaoRef = useRef<HTMLElement>(null)
  // Só há o que comparar com uma anterior; a primeira versão fica com a nota.
  const mudancas = anterior ? (versao.mudancas ?? []) : []

  // O índice não traz os campos: o dicionário da vigente resolve o verbete de cada mudança. Até
  // ele chegar, ou se falhar, a lista aparece sem link.
  const { data: dicionario } = useLayoutVersao(mudancas.length > 0 ? versao.slug : '')
  const campos = useMemo(
    () =>
      (dicionario?.camposPorGrupo ?? []).flatMap((grupo) =>
        grupo.campos.map((campo) => ({ slug: campo.slug, caminhoXml: campo.caminhoXml })),
      ),
    [dicionario],
  )

  // A seção nasce depois do fetch, quando o navegador já desistiu da âncora: rola por conta própria.
  useEffect(() => {
    if (window.location.hash !== `#${ID_NOVIDADES_DO_LAYOUT}`) return
    // O jsdom não implementa `scrollIntoView`; o navegador sempre tem.
    secaoRef.current?.scrollIntoView?.({ block: 'start' })
  }, [])

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
        {anterior && (
          <ContadoresDeMudanca
            contadores={contarMudancasDaVersao(mudancas, {
              novos: novidades.camposNovos,
              descontinuados: novidades.camposDescontinuados,
            })}
          />
        )}
      </div>

      <NotaDaVersao descricao={novidades.descricao} somenteResumo={mudancas.length > 0} />
      <ListaDeMudancas mudancas={mudancas} campos={campos} />

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
