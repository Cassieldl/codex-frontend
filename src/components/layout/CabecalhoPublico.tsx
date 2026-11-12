import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { BuscaDoCabecalho } from '../../features/busca/components/BuscaDoCabecalho'
import { PontosDeLuz } from './PontosDeLuz'
import { PularParaConteudo } from './PularParaConteudo'

export interface CabecalhoPublicoProps {
  /**
   * Hero embutido no cabeçalho, com o campo de busca grande da Home e de `/busca`. Página que passa
   * o hero não ganha a busca compacta: seriam dois campos de busca na mesma tela.
   */
  children?: ReactNode
}

/**
 * Item da nav: o indicador de página atual é o sublinhado laranja, onde o laranja só pontua
 * (5,66:1 sobre o azul-profundo). Vem do `data-status="active"` que o próprio `<Link>` marca.
 */
const CLASSE_ITEM_NAV =
  'relative py-1 text-sm font-semibold text-white after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-pill after:bg-transparent hover:after:bg-white data-[status=active]:after:bg-accent'

/**
 * Cabeçalho de toda página pública, sempre escuro (`--grad-escuro` com pontos de luz), porque o
 * logo oficial da Migrate só existe em versão branca. Nav: Provedores, Layout InvoiCy, Artigos e
 * Como funciona, na ordem do artboard.
 *
 * **`activeOptions={{ exact: true }}` nos quatro links da nav.** Sem isso o `<Link>` marca
 * `aria-current="page"` por casamento PARCIAL de caminho: em `/layout/{versao}` o item "Layout
 * InvoiCy" ficava "página atual" ao lado do chip da versão, que também é `page`. O `<Link>`
 * sobrepõe `aria-current` sempre que está ativo, então marcar a seção com `"true"` exigiria
 * calcular a atividade por fora do roteador. O logo não recebe a prop: com `to="/"` o
 * casamento parcial nunca dispara.
 */
export function CabecalhoPublico({ children }: CabecalhoPublicoProps) {
  return (
    <header className="relative isolate bg-primary text-white">
      <PontosDeLuz />

      {/* Primeiro elemento focável do documento — depois do logo já não serve para pular nada. */}
      <PularParaConteudo />

      {/*
        `flex-wrap` nos dois níveis: abaixo de ~640px a marca e os quatro itens não cabem numa
        linha, e quebrar em duas mantém o menu inteiro legível.
      */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 lg:px-8">
        <Link to="/" aria-label="Migrate Codex, página inicial" className="flex items-center gap-3">
          <img src="/marca/logo-migrate-branco.svg" alt="Migrate" className="h-7 w-auto" />
          <span aria-hidden="true" className="h-6 w-px bg-white/40" />
          <span className="text-lg font-extrabold">Codex</span>
        </Link>

        {/* Abaixo de `lg` a busca não cabe entre a marca e o menu: desce para uma linha própria. */}
        {!children && (
          <div className="order-last w-full lg:order-none lg:w-auto lg:max-w-sm lg:flex-1">
            <BuscaDoCabecalho />
          </div>
        )}

        <nav
          aria-label="Navegação principal"
          className="flex flex-wrap items-center gap-x-6 gap-y-1"
        >
          <Link
            to="/provedores"
            search={{ pagina: 1 }}
            activeOptions={{ exact: true }}
            className={CLASSE_ITEM_NAV}
          >
            Provedores
          </Link>
          <Link to="/layout" activeOptions={{ exact: true }} className={CLASSE_ITEM_NAV}>
            Layout InvoiCy
          </Link>
          <Link
            to="/artigos"
            search={{ pagina: 1 }}
            activeOptions={{ exact: true }}
            className={CLASSE_ITEM_NAV}
          >
            Artigos
          </Link>
          <Link to="/como-funciona" activeOptions={{ exact: true }} className={CLASSE_ITEM_NAV}>
            Como funciona
          </Link>
        </nav>
      </div>

      {children && (
        <div className="mx-auto max-w-6xl border-t border-white/15 px-4 pt-10 pb-12 lg:px-8">
          {children}
        </div>
      )}
    </header>
  )
}
