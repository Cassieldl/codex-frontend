import { ChevronDown } from 'lucide-react'
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
  aberto: boolean
  /** Há filtro ativo: a meta mostra "v de n campos". */
  filtrando: boolean
  slugAtivo: string | null
  /** Sincroniza o estado com o `<details>`: o navegador também abre o bloco (Ctrl+F, fragmento). */
  onAlternar: (raiz: string, aberto: boolean) => void
  onAbrirCampo: (slug: string) => void
  /** Liga o atalho "Ver na estrutura" de cada linha. */
  atalhoDaEstrutura?: AtalhoDaEstruturaNoDicionario
}

export interface AtalhoDaEstruturaNoDicionario {
  versaoSlug: string
  formatosDoCampo: FormatosDoCampo
}

interface ColunaDoBloco {
  chave: string
  rotulo: string
  soNoDesktop: boolean
}

/**
 * Fonte única das colunas: o `<colgroup>`, o cabeçalho da tabela e o grid dos rótulos fixos saem da
 * mesma lista, para os rótulos não se desalinharem das células. Sem largura própria: as três
 * dividem a tabela por igual.
 */
const COLUNAS: ColunaDoBloco[] = [
  { chave: 'campo', rotulo: 'Campo', soNoDesktop: false },
  { chave: 'caminho', rotulo: 'Caminho no Layout InvoiCy', soNoDesktop: true },
  { chave: 'significado', rotulo: 'Significado', soNoDesktop: true },
]

const GRID_DOS_ROTULOS = COLUNAS.map(() => 'minmax(0, 1fr)').join(' ')

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

function RotulosDasColunas() {
  return (
    <div
      aria-hidden="true"
      style={{ gridTemplateColumns: GRID_DOS_ROTULOS }}
      className="sticky top-12 z-[9] hidden h-8 items-center border-t border-b border-line bg-white min-[860px]:grid"
    >
      {COLUNAS.map(({ chave, rotulo }) => (
        <span key={chave} className="px-3 text-xs font-medium text-muted">
          {rotulo}
        </span>
      ))}
    </div>
  )
}

/**
 * Um bloco do layout (raiz do XSD) como `<details>` recolhível. Cada subgrupo tem a sua tabela,
 * com subtítulo fixo. O subtítulo quebra em vez de truncar: o que distingue dois subgrupos fica no
 * fim do caminho. Não usa `TableRoot`: o `overflow-x-auto` dele anula o `position: sticky`.
 */
export function BlocoDoDicionario({
  bloco,
  versaoRotulo,
  novosDoBloco,
  aberto,
  filtrando,
  slugAtivo,
  onAlternar,
  onAbrirCampo,
  atalhoDaEstrutura,
}: BlocoDoDicionarioProps) {
  return (
    <details
      id={`bloco-${bloco.raiz}`}
      open={aberto}
      onToggle={(evento) => onAlternar(bloco.raiz, evento.currentTarget.open)}
      className="group mb-3 scroll-mt-4 rounded-[var(--radius-card)] border border-border bg-white"
    >
      <summary className="sticky top-0 z-10 flex h-12 cursor-pointer list-none items-center gap-3 rounded-[var(--radius-card)] bg-surface-hover px-4 hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light group-open:rounded-b-none [&::-webkit-details-marker]:hidden">
        <h3 className="text-card-titulo font-medium text-ink">{bloco.rotulo}</h3>
        <span className="min-w-0 truncate text-xs text-muted tabular-nums">
          {descreverMeta(bloco, novosDoBloco, filtrando)}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="ml-auto size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
        />
      </summary>

      <RotulosDasColunas />

      {bloco.subgrupos.map((subgrupo) => (
        <div
          key={subgrupo.chave}
          id={subgrupo.grupoSlug ? `grupo-${subgrupo.grupoSlug}` : undefined}
          className="scroll-mt-28"
        >
          {subgrupo.titulo && (
            <h4 className="sticky top-12 z-[8] flex min-h-8 items-center border-t border-line bg-white px-4 py-1.5 text-xs font-semibold tracking-wide text-muted uppercase [overflow-wrap:anywhere] min-[860px]:top-20">
              {subgrupo.titulo}
            </h4>
          )}

          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">
              Campos de {descreverTrilha(bloco.rotulo, subgrupo)}
            </caption>
            <colgroup>
              {COLUNAS.map(({ chave, soNoDesktop }) => (
                <col
                  key={chave}
                  className={soNoDesktop ? 'hidden min-[860px]:table-column' : undefined}
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
      ))}
    </details>
  )
}
