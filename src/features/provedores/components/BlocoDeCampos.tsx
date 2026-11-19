import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { SecaoInicialDoModal } from '../types/modalDoCampo'
import type { BlocoDeCampos as BlocoDeCamposDados, SubgrupoDeCampos } from '../utils/blocosDeCampos'
import { recortarCamposDoBloco } from '../utils/recortarCamposDoBloco'
import { CLASSE_SO_NO_DESKTOP, LinhaDoCampo } from './LinhaDoCampo'

export interface BlocoDeCamposProps {
  bloco: BlocoDeCamposDados
  aberto: boolean
  /** Há filtro ativo: a meta mostra "v de n campos". */
  filtrando: boolean
  slugAtivo: string | null
  /** A versão tem algum exemplo: sem nenhum, a coluna Exemplo sai da tabela inteira. */
  mostrarExemplo?: boolean
  /** Sincroniza o estado com o `<details>`: o navegador também abre o bloco (Ctrl+F, fragmento). */
  onAlternar: (raiz: string, aberto: boolean) => void
  onAbrirCampo: (campoLayoutSlug: string, secao?: SecaoInicialDoModal) => void
}

interface ColunaDoBloco {
  chave: string
  /** Cabeçalho da tabela, para leitor de tela. */
  rotulo: string
  /** Rótulo da linha visível, quando é mais curto que o cabeçalho. */
  rotuloVisivel?: string
  alinhadoADireita?: boolean
  /** Largura fixa; sem ela a coluna divide o resto por igual. */
  largura: string | null
  soNoDesktop: boolean
}

/**
 * Fonte única das colunas: o `<colgroup>` da tabela e o grid dos rótulos fixos saem da mesma
 * lista, para os rótulos não se desalinharem das células.
 */
const COLUNAS: ColunaDoBloco[] = [
  { chave: 'uso', rotulo: 'Uso', largura: '7.25rem', soNoDesktop: true },
  { chave: 'campo', rotulo: 'Campo InvoiCy', largura: null, soNoDesktop: false },
  { chave: 'tag', rotulo: 'Tag do provedor', largura: null, soNoDesktop: false },
  { chave: 'tipo', rotulo: 'Tipo', largura: '6rem', soNoDesktop: true },
  { chave: 'exemplo', rotulo: 'Exemplo', largura: null, soNoDesktop: true },
  {
    chave: 'rejeicoes',
    rotulo: 'Rejeições registradas',
    rotuloVisivel: 'Rejeições',
    largura: '6rem',
    soNoDesktop: false,
    alinhadoADireita: true,
  },
]

const COLUNAS_SEM_EXEMPLO = COLUNAS.filter(({ chave }) => chave !== 'exemplo')

const COLUNA_SEM_LARGURA_NO_GRID = 'minmax(0, 1fr)'

function montarGridDosRotulos(colunas: ColunaDoBloco[]): string {
  return colunas.map(({ largura }) => largura ?? COLUNA_SEM_LARGURA_NO_GRID).join(' ')
}

const CLASSE_DA_CELULA_DE_ROTULO = 'px-3 text-aux font-semibold tracking-wide text-muted uppercase'

function descreverQuantidade(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

function descreverMeta(bloco: BlocoDeCamposDados, filtrando: boolean): string {
  const obrigatorios = descreverQuantidade(bloco.obrigatoriosDoBloco, 'obrigatório', 'obrigatórios')
  const campos = filtrando
    ? `${bloco.totalVisivel} de ${descreverQuantidade(bloco.totalDoBloco, 'campo', 'campos')}`
    : descreverQuantidade(bloco.totalDoBloco, 'campo', 'campos')

  return `${campos} · ${obrigatorios}`
}

function descreverTrilha(rotulo: string, subgrupo: SubgrupoDeCampos): string {
  return subgrupo.titulo ? `${rotulo} › ${subgrupo.titulo}` : rotulo
}

function RotulosDasColunas({ colunas }: { colunas: ColunaDoBloco[] }) {
  return (
    <div
      aria-hidden="true"
      style={{ gridTemplateColumns: montarGridDosRotulos(colunas) }}
      className="sticky top-[calc(var(--topo-fixo,0px)_+_3rem)] z-[9] hidden h-8 items-center border-t border-b border-border bg-white min-[860px]:grid"
    >
      {colunas.map(({ chave, rotulo, rotuloVisivel, alinhadoADireita }) => (
        <span
          key={chave}
          className={clsx(CLASSE_DA_CELULA_DE_ROTULO, alinhadoADireita && 'text-right')}
        >
          {rotuloVisivel ?? rotulo}
        </span>
      ))}
    </div>
  )
}

/**
 * Um bloco do layout (raiz do XSD) como `<details>` recolhível. Cada subgrupo tem a sua tabela,
 * com subtítulo fixo: o mesmo nome de tag pode existir em dois subgrupos e só o subtítulo diz de
 * qual deles é a linha. Não usa `TableRoot`: o `overflow-x-auto` dele anula o `position: sticky`.
 */
export function BlocoDeCampos({
  bloco,
  aberto,
  filtrando,
  slugAtivo,
  mostrarExemplo = true,
  onAlternar,
  onAbrirCampo,
}: BlocoDeCamposProps) {
  const colunas = mostrarExemplo ? COLUNAS : COLUNAS_SEM_EXEMPLO
  const [mostrandoTodos, setMostrandoTodos] = useState(false)

  // Com busca ou filtro, aparece tudo o que casou; o campo aberto por link também nunca fica oculto.
  const contemAtivo = bloco.subgrupos.some((subgrupo) =>
    subgrupo.campos.some((campo) => campo.campoLayoutSlug === slugAtivo),
  )
  const recorte =
    filtrando || mostrandoTodos || contemAtivo
      ? { subgrupos: bloco.subgrupos, ocultos: 0 }
      : recortarCamposDoBloco(bloco.subgrupos)

  return (
    <details
      id={`bloco-${bloco.raiz}`}
      open={aberto}
      onToggle={(evento) => onAlternar(bloco.raiz, evento.currentTarget.open)}
      className="group mb-3 scroll-mt-[calc(var(--topo-fixo,0px)_+_1rem)] rounded-[var(--radius-card)] border border-border bg-white"
    >
      <summary className="sticky top-[var(--topo-fixo,0px)] z-10 flex h-12 cursor-pointer list-none items-center gap-3 rounded-[var(--radius-card)] bg-surface-hover px-4 hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover group-open:rounded-b-none [&::-webkit-details-marker]:hidden">
        <h3 className="text-card-titulo font-medium text-ink">{bloco.rotulo}</h3>
        <span className="min-w-0 truncate text-xs text-muted tabular-nums">
          {descreverMeta(bloco, filtrando)}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="ml-auto size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
        />
      </summary>

      <RotulosDasColunas colunas={colunas} />

      {recorte.subgrupos.map((subgrupo) => (
        <div
          key={subgrupo.chave}
          id={subgrupo.grupoSlug ? `grupo-${subgrupo.grupoSlug}` : undefined}
          className="scroll-mt-[calc(var(--topo-fixo,0px)_+_7rem)]"
        >
          {subgrupo.titulo && (
            <h4 className="sticky top-[calc(var(--topo-fixo,0px)_+_3rem)] z-[8] flex h-8 items-center border-t border-border bg-white px-4 text-xs font-semibold tracking-wide text-muted uppercase min-[860px]:top-[calc(var(--topo-fixo,0px)_+_5rem)]">
              {subgrupo.titulo}
            </h4>
          )}

          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">
              Campos de {descreverTrilha(bloco.rotulo, subgrupo)}
            </caption>
            <colgroup>
              {colunas.map(({ chave, largura, soNoDesktop }) => (
                <col
                  key={chave}
                  style={largura ? { width: largura } : undefined}
                  className={soNoDesktop ? 'hidden min-[860px]:table-column' : undefined}
                />
              ))}
            </colgroup>
            <thead className="sr-only">
              <tr>
                {colunas.map(({ chave, rotulo, soNoDesktop }) => (
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
                <LinhaDoCampo
                  key={campo.campoLayoutSlug}
                  campo={campo}
                  ativo={campo.campoLayoutSlug === slugAtivo}
                  mostrarExemplo={mostrarExemplo}
                  onAbrir={onAbrirCampo}
                />
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {recorte.ocultos > 0 && (
        <p className="border-t border-border px-4 py-3 text-xs text-muted">
          Mais {recorte.ocultos} {recorte.ocultos === 1 ? 'campo' : 'campos'} em {bloco.rotulo}.{' '}
          <button
            type="button"
            onClick={() => setMostrandoTodos(true)}
            className="font-semibold link-texto"
          >
            Mostrar todos
          </button>
        </p>
      )}
    </details>
  )
}
