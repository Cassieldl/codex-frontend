import { ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import type { ExemploPublico } from '../types/exemplo'
import {
  construirIdExemplo,
  construirLinkExemplo,
  useExemploDestacadoPorAncora,
} from '../utils/exemploAncora'
import { ID_SECAO_EXEMPLOS } from '../utils/secoesDoProvedor'

export interface ExemplosVersaoProps {
  exemplos: ExemploPublico[]
  provedorSlug: string
}

/**
 * "Exemplos" da página do provedor (tela 5): acordeão de cenários completos de
 * emissão, cada um com âncora copiável `#exemplo-{slug}` (C4: exemplo não tem
 * página própria, tem âncora dentro da página do provedor).
 *
 * Sem `EmptyState`: provedor sem exemplo simplesmente não mostra a seção, mesma
 * regra de `AvisosVersao`/`ErrosConhecidos` — a página já disputa espaço com
 * Avisos, Campos e Erros, e "nenhum exemplo" não é informação de negócio aqui.
 *
 * O XML é bloco de código opaco, sem realce de "linha alterada": o artboard
 * desenha um diff que o contrato não sustenta (`ExemploPublico.xml` é uma
 * string, sem metadado de quais linhas mudam). Inferir o diff no cliente seria
 * a tela afirmando o que não sabe.
 */
export function ExemplosVersao({ exemplos, provedorSlug }: ExemplosVersaoProps) {
  const idBase = useId()
  const exemploNaAncora = useExemploDestacadoPorAncora()
  const [exemploAberto, setExemploAberto] = useState<string | null>(exemploNaAncora)

  // Chegar por `#exemplo-{slug}` abre aquele cenário e rola até ele — um link
  // copiável que entrega um acordeão fechado não cumpre o que prometeu.
  useEffect(() => {
    if (!exemploNaAncora) return
    setExemploAberto(exemploNaAncora)
    document.getElementById(construirIdExemplo(exemploNaAncora))?.scrollIntoView({ block: 'start' })
  }, [exemploNaAncora])

  if (exemplos.length === 0) return null

  return (
    <section
      id={ID_SECAO_EXEMPLOS}
      aria-labelledby="exemplos-titulo"
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <header className="flex flex-col gap-1">
        <h2 id="exemplos-titulo" className="text-subtitulo font-semibold text-ink">
          Exemplos
        </h2>
        <p className="max-w-[70ch] text-sm text-muted">
          Cenários completos de emissão, com o XML como ele é enviado.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {exemplos.map((exemplo) => {
          const aberto = exemploAberto === exemplo.slug
          const idPainel = `${idBase}-${exemplo.slug}`
          const IconeEstado = aberto ? ChevronDown : ChevronRight

          return (
            <li
              key={exemplo.slug}
              id={construirIdExemplo(exemplo.slug)}
              className="scroll-mt-24 rounded-[var(--radius-card)] border border-border"
            >
              <div className="flex flex-wrap items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-card-titulo font-medium text-ink">{exemplo.nome}</h3>
                  {exemplo.descricao && (
                    <p className="mt-1 max-w-[88ch] text-sm text-muted">{exemplo.descricao}</p>
                  )}
                </div>

                <BotaoCopiar
                  compacto
                  icone="link"
                  valor={() =>
                    construirLinkExemplo(window.location.origin, provedorSlug, exemplo.slug)
                  }
                  rotulo="Copiar link"
                  ariaLabel={`Copiar link do exemplo ${exemplo.nome}`}
                />

                <button
                  type="button"
                  onClick={() => setExemploAberto(aberto ? null : exemplo.slug)}
                  aria-expanded={aberto}
                  aria-controls={idPainel}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-white px-2.5 text-xs font-medium text-ink hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
                >
                  <IconeEstado className="size-3.5 shrink-0" aria-hidden="true" />
                  {aberto ? 'Fechar o XML' : 'Ver o XML'}
                </button>
              </div>

              {/* O painel existe sempre no DOM para que `aria-controls` aponte
                  para um alvo real; só o conteúdo é montado ao abrir. A região
                  rolável recebe foco para ser percorrida por teclado (WCAG
                  2.1.1) — daí o `tabIndex` e o rótulo no `<pre>`. */}
              <div id={idPainel} hidden={!aberto} className="px-4 pb-4">
                {aberto && (
                  <pre
                    tabIndex={0}
                    role="region"
                    aria-label={`XML do exemplo ${exemplo.nome}`}
                    className="overflow-auto rounded-[var(--radius-input)] border border-border bg-surface-disabled p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
                  >
                    <code className="font-mono text-xs leading-relaxed text-ink">
                      {exemplo.xml}
                    </code>
                  </pre>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
