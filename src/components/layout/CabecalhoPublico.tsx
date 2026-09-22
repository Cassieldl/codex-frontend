import { Link, type LinkProps } from '@tanstack/react-router'
import clsx from 'clsx'
import type { ReactNode } from 'react'

export interface CabecalhoPublicoProps {
  /**
   * `destaque` aplica o fundo escuro (`--grad-escuro`) e é usado só por
   * `/busca` (§7.1), que embute o campo de busca dentro do próprio
   * cabeçalho via `children`.
   */
  variante?: 'padrao' | 'destaque'
  children?: ReactNode
}

/**
 * Cabeçalho de toda página pública (M31 — dono: FRONT-A; demais unidades
 * importam, não editam). Nav mostra logo (→ `/`), "Provedores"
 * (→ `/provedores`), "Layout InvoiCy" (→ `/layout`, §2.6 — entre Provedores
 * e Artigos, ordem do artboard), "Artigos" (→ `/artigos`) e "Como funciona"
 * (→ `/como-funciona`, §4.1 — sempre presente, mesmo antes de o artigo
 * reservado existir; é navegação, não dado).
 *
 * **`activeOptions={{ exact: true }}` nos quatro links da nav.** Sem isso o
 * `<Link>` marca `aria-current="page"` sozinho por casamento PARCIAL de
 * caminho: em `/layout/{versao}` o item "Layout InvoiCy" ficava "página
 * atual" ao lado do chip da versão, que também é `page` — dois "página atual"
 * na mesma tela, sem erro de tipo e sem nada visível fora do leitor de tela.
 *
 * Marcar a **seção** com `aria-current="true"` (que é o que um menu principal
 * quer dizer) foi considerado e é inviável por prop: o `<Link>` sobrepõe
 * `aria-current` com `"page"` sempre que está ativo — `STATIC_ACTIVE_PROPS` é
 * espalhado DEPOIS das props do chamador e depois de `activeProps`
 * (`@tanstack/react-router/dist/esm/link.js`). Obter `"true"` exigiria
 * calcular a atividade por fora do roteador, que é exatamente a duplicação de
 * fonte de verdade que causou este defeito. Como a nav não tem nenhum estado
 * ativo VISUAL (só `hover:underline`), o `exact` não esconde pista nenhuma de
 * navegação — só remove um anúncio falso.
 *
 * O **logo não recebe a prop**, de propósito: com `to="/"` o casamento parcial
 * nunca dispara, porque o teste de prefixo exige que o caractere seguinte ao
 * destino seja `/` e, para o destino `/`, esse caractere é a primeira letra da
 * rota. Medido por mutação — remover a prop do logo não derrubava teste
 * nenhum, e prop inerte é pior que prop ausente. O invariante continua coberto
 * pelo teste que CONTA os `aria-current` da página.
 */
export function CabecalhoPublico({ variante = 'padrao', children }: CabecalhoPublicoProps) {
  const destaque = variante === 'destaque'

  return (
    <header
      className={clsx(
        destaque
          ? 'bg-[image:var(--grad-escuro)] text-white'
          : 'border-b border-line bg-white text-ink',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
        <Link to="/" className="text-lg font-extrabold">
          Codex
        </Link>

        <nav aria-label="Navegação principal" className="flex items-center gap-6">
          <Link
            to="/provedores"
            search={{ pagina: 1 }}
            activeOptions={{ exact: true }}
            className={clsx(
              'text-sm font-medium hover:underline',
              destaque ? 'text-white' : 'text-ink',
            )}
          >
            Provedores
          </Link>
          {/*
            `/layout` ainda não existe como rota registrada nesta unidade
            (FRONT-C cria as telas) — cast via `LinkProps['to']`, mesmo padrão
            de `RodapeContextual.tsx`/`AbasNavegaveis.tsx` para link de
            destino fora do espaço de rotas tipado no momento da escrita.
          */}
          <Link
            to={'/layout' as unknown as LinkProps['to']}
            activeOptions={{ exact: true }}
            className={clsx(
              'text-sm font-medium hover:underline',
              destaque ? 'text-white' : 'text-ink',
            )}
          >
            Layout InvoiCy
          </Link>
          <Link
            to="/artigos"
            search={{ pagina: 1 }}
            activeOptions={{ exact: true }}
            className={clsx(
              'text-sm font-medium hover:underline',
              destaque ? 'text-white' : 'text-ink',
            )}
          >
            Artigos
          </Link>
          <Link
            to="/como-funciona"
            activeOptions={{ exact: true }}
            className={clsx(
              'text-sm font-medium hover:underline',
              destaque ? 'text-white' : 'text-ink',
            )}
          >
            Como funciona
          </Link>
        </nav>
      </div>

      {children && <div className="mx-auto max-w-6xl px-4 pb-8 lg:px-8">{children}</div>}
    </header>
  )
}
