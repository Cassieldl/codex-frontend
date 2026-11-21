import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import type { BlocoDoLayout, SubgrupoDoLayout } from '../../../utils/blocosDoLayout'
import type { CampoLayoutPublico } from '../types/layoutPublico'
import type { FormatosDoCampo } from '../utils/formatosDoCampoNaEstrutura'
import { CLASSE_SO_NO_DESKTOP, LinhaDoVerbete } from './LinhaDoVerbete'

export interface BlocoDoDicionarioProps {
  bloco: BlocoDoLayout<CampoLayoutPublico>
  /** Rótulo cru da versão que o selo "novo na versão …" completa. */
  versaoRotulo: string
  /** Campos novos do bloco inteiro, sem filtro (como `totalDoBloco`). */
  novosDoBloco: number
  /**
   * Recolhível: `<details>`, para a lista de resultados de uma busca. Fixo: o bloco único que o
   * dicionário mostra sem filtro, sempre aberto, com `rodape` para ir ao vizinho.
   */
  recolhivel?: boolean
  /** Só no recolhível. */
  aberto?: boolean
  /** Há filtro ativo: a meta mostra "v de n campos". */
  filtrando: boolean
  slugAtivo: string | null
  /** Sincroniza o estado com o `<details>`: o navegador também abre o bloco (Ctrl+F, fragmento). */
  onAlternar?: (raiz: string, aberto: boolean) => void
  onAbrirCampo: (slug: string) => void
  /** Liga o atalho "Ver na estrutura" de cada linha. */
  atalhoDaEstrutura?: AtalhoDaEstruturaNoDicionario
  rodape?: ReactNode
}

export interface AtalhoDaEstruturaNoDicionario {
  versaoSlug: string
  formatosDoCampo: FormatosDoCampo
}

interface ColunaDoBloco {
  chave: string
  rotulo: string
  soNoDesktop: boolean
  largura?: string
}

/** O caminho mora na célula do campo, embaixo do nome; a seta não tem cabeçalho visível. */
const COLUNAS: ColunaDoBloco[] = [
  { chave: 'campo', rotulo: 'Campo', soNoDesktop: false, largura: 'min-[860px]:w-2/5' },
  { chave: 'significado', rotulo: 'Significado', soNoDesktop: true },
  { chave: 'abrir', rotulo: 'Abrir', soNoDesktop: true, largura: 'w-10' },
]

function descreverQuantidade(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

function descreverMeta(
  bloco: BlocoDoLayout<CampoLayoutPublico>,
  novosDoBloco: number,
  filtrando: boolean,
): string {
  const campos = filtrando
    ? `${bloco.totalVisivel} de ${descreverQuantidade(bloco.totalDoBloco, 'campo', 'campos')}`
    : descreverQuantidade(bloco.totalDoBloco, 'campo', 'campos')

  if (novosDoBloco === 0) return campos
  return `${campos} · ${descreverQuantidade(novosDoBloco, 'novo', 'novos')}`
}

function descreverTrilha(rotulo: string, subgrupo: SubgrupoDoLayout<CampoLayoutPublico>): string {
  return subgrupo.titulo ? `${rotulo} › ${subgrupo.titulo}` : rotulo
}

interface TabelasDoBlocoProps {
  bloco: BlocoDoLayout<CampoLayoutPublico>
  versaoRotulo: string
  slugAtivo: string | null
  onAbrirCampo: (slug: string) => void
  atalhoDaEstrutura?: AtalhoDaEstruturaNoDicionario
  /** Altura do que fica fixo acima do subtítulo: o resumo do `<details>` ou nada. */
  classeDoTopoDoSubtitulo: string
}

/**
 * Uma tabela por subgrupo, com subtítulo fixo. O subtítulo quebra em vez de truncar: o que
 * distingue dois subgrupos fica no fim do caminho. Não usa `TableRoot`: o `overflow-x-auto` dele
 * anula o `position: sticky`.
 */
function TabelasDoBloco({
  bloco,
  versaoRotulo,
  slugAtivo,
  onAbrirCampo,
  atalhoDaEstrutura,
  classeDoTopoDoSubtitulo,
}: TabelasDoBlocoProps) {
  return bloco.subgrupos.map((subgrupo) => (
    <div
      key={subgrupo.chave}
      id={subgrupo.grupoSlug ? `grupo-${subgrupo.grupoSlug}` : undefined}
      className="scroll-mt-28"
    >
      {subgrupo.titulo && (
        <h4
          className={cn(
            'sticky z-[8] flex min-h-8 items-center border-t border-border bg-white px-4 py-1.5 text-xs font-semibold tracking-wide text-muted uppercase [overflow-wrap:anywhere]',
            classeDoTopoDoSubtitulo,
          )}
        >
          {subgrupo.titulo}
        </h4>
      )}

      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">Campos de {descreverTrilha(bloco.rotulo, subgrupo)}</caption>
        <colgroup>
          {COLUNAS.map(({ chave, soNoDesktop, largura }) => (
            <col
              key={chave}
              className={cn(soNoDesktop && 'hidden min-[860px]:table-column', largura)}
            />
          ))}
        </colgroup>
        <thead className="sr-only">
          <tr>
            {COLUNAS.map(({ chave, rotulo, soNoDesktop }) => (
              <th
                key={chave}
                scope="col"
                className={soNoDesktop ? CLASSE_SO_NO_DESKTOP : undefined}
              >
                {rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subgrupo.campos.map((campo) => (
            <LinhaDoVerbete
              key={campo.slug}
              campo={campo}
              versaoRotulo={versaoRotulo}
              ativo={campo.slug === slugAtivo}
              onAbrir={onAbrirCampo}
              versaoSlug={atalhoDaEstrutura?.versaoSlug}
              formatosNaEstrutura={atalhoDaEstrutura?.formatosDoCampo(campo.slug)}
            />
          ))}
        </tbody>
      </table>
    </div>
  ))
}

/**
 * Um bloco do layout (raiz do XSD). Recolhível na lista de resultados de uma busca; fixo e aberto
 * quando o dicionário mostra um bloco por vez.
 */
export function BlocoDoDicionario({
  bloco,
  versaoRotulo,
  novosDoBloco,
  recolhivel = true,
  aberto = false,
  filtrando,
  slugAtivo,
  onAlternar,
  onAbrirCampo,
  atalhoDaEstrutura,
  rodape,
}: BlocoDoDicionarioProps) {
  const meta = descreverMeta(bloco, novosDoBloco, filtrando)
  const tabelas = {
    bloco,
    versaoRotulo,
    slugAtivo,
    onAbrirCampo,
    atalhoDaEstrutura,
  }

  if (!recolhivel) {
    const tituloId = `bloco-${bloco.raiz}-titulo`

    return (
      <section
        id={`bloco-${bloco.raiz}`}
        aria-labelledby={tituloId}
        className="scroll-mt-4 rounded-[var(--radius-card)] border border-border bg-white"
      >
        <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 py-4">
          <h3
            id={tituloId}
            tabIndex={-1}
            className="text-subtitulo font-extrabold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover"
          >
            {bloco.rotulo}
          </h3>
          <span className="text-xs text-muted tabular-nums">{meta}</span>
        </header>

        <TabelasDoBloco {...tabelas} classeDoTopoDoSubtitulo="top-0" />

        {rodape && <div className="border-t border-border px-5 py-3">{rodape}</div>}
      </section>
    )
  }

  return (
    <details
      id={`bloco-${bloco.raiz}`}
      open={aberto}
      onToggle={(evento) => onAlternar?.(bloco.raiz, evento.currentTarget.open)}
      className="group mb-3 scroll-mt-4 rounded-[var(--radius-card)] border border-border bg-white"
    >
      <summary className="sticky top-0 z-10 flex h-12 cursor-pointer list-none items-center gap-3 rounded-[var(--radius-card)] bg-surface-hover px-4 hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover group-open:rounded-b-none [&::-webkit-details-marker]:hidden">
        <h3 className="text-card-titulo font-medium text-ink">{bloco.rotulo}</h3>
        <span className="min-w-0 truncate text-xs text-muted tabular-nums">{meta}</span>
        <ChevronDown
          aria-hidden="true"
          className="ml-auto size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
        />
      </summary>

      <TabelasDoBloco {...tabelas} classeDoTopoDoSubtitulo="top-12" />
    </details>
  )
}
