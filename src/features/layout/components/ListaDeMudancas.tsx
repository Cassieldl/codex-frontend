import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useId, useState } from 'react'
import type { MudancaDaVersaoLayout, TipoDeMudanca } from '../types/layoutPublico'
import { agruparMudancas, caminhoNaoMudou, campoDaMudanca } from '../utils/mudancasDaVersao'
import type { CampoCitavel } from '../utils/mudancasDaVersao'

export interface ListaDeMudancasProps {
  mudancas: readonly MudancaDaVersaoLayout[]
  /** Campos do dicionário da versão; sem eles, nenhum caminho vira link. */
  campos?: readonly CampoCitavel[]
  /** Quantas mudanças aparecem antes do "Ver todas"; sem ele, a lista vem inteira. */
  limite?: number
}

const CLASSE_DO_CAMINHO = 'font-mono text-[13px] font-semibold [overflow-wrap:anywhere]'

const CLASSE_DO_LINK =
  'rounded text-primary-medium underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover'

const ETIQUETA_DO_TIPO: Record<TipoDeMudanca, { rotulo: string; classe: string }> = {
  grupoNovo: { rotulo: 'Grupo novo', classe: 'bg-alert-success text-alert-success-texto' },
  campoNovo: { rotulo: 'Novo', classe: 'bg-alert-success text-alert-success-texto' },
  mudouDeLugar: { rotulo: 'Mudou de lugar', classe: 'bg-alert-info text-primary' },
  renomeado: { rotulo: 'Renomeado', classe: 'bg-alert-warning text-alert-warning-texto' },
  saiu: { rotulo: 'Saiu', classe: 'bg-alert-error text-alert-error-texto' },
  alterado: { rotulo: 'Alterado', classe: 'bg-surface-hover text-muted' },
}

interface CaminhoProps {
  texto: string
  slug: string | null
}

function Caminho({ texto, slug }: CaminhoProps) {
  if (!slug) return <span className={`${CLASSE_DO_CAMINHO} text-ink`}>{texto}</span>

  return (
    <Link
      to="/layout/campos/$campoSlug"
      params={{ campoSlug: slug }}
      className={`${CLASSE_DO_CAMINHO} ${CLASSE_DO_LINK}`}
    >
      {texto}
    </Link>
  )
}

interface CartaoDaMudancaProps {
  mudanca: MudancaDaVersaoLayout
  campos: readonly CampoCitavel[]
}

function CartaoDaMudanca({ mudanca, campos }: CartaoDaMudancaProps) {
  const slug = campoDaMudanca(mudanca, campos)
  const mesmoCaminho = caminhoNaoMudou(mudanca)
  const comAntes = !mesmoCaminho && mudanca.antes !== null && mudanca.antes.trim() !== ''
  const comDepois = mudanca.depois !== null && mudanca.depois.trim() !== ''
  const etiqueta = ETIQUETA_DO_TIPO[mudanca.tipo]

  return (
    <li
      data-mudanca={mudanca.tipo}
      className="flex min-w-0 flex-col gap-1.5 rounded-[var(--radius-control)] border border-border bg-white px-4 py-3"
    >
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`rounded-[var(--radius-control)] px-2 py-0.5 text-aux font-bold tracking-wide uppercase ${etiqueta.classe}`}
        >
          {etiqueta.rotulo}
        </span>{' '}
        <span data-caminho="" className="inline-flex min-w-0 flex-wrap items-center gap-x-2">
          {comAntes && (
            <Caminho texto={mudanca.antes ?? ''} slug={mudanca.tipo === 'saiu' ? slug : null} />
          )}
          {comAntes && comDepois && (
            <>
              {' '}
              <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
              <span className="sr-only">passou a ser</span>{' '}
            </>
          )}
          {comDepois && (
            <Caminho texto={mudanca.depois ?? ''} slug={mudanca.tipo === 'saiu' ? null : slug} />
          )}
        </span>
      </p>
      {mudanca.descricao && (
        <p title={mudanca.descricao} className="truncate text-xs text-muted">
          {mudanca.descricao}
        </p>
      )}
    </li>
  )
}

/**
 * Mudanças da versão em cartões, na ordem fixa dos tipos, cada uma com a etiqueta do tipo e o
 * caminho ("antes, seta, depois"; com o mesmo caminho dos dois lados, só o caminho). A descrição
 * fica numa linha, com o texto inteiro no `title`. Campo que o dicionário da versão tem leva ao
 * verbete dele. Com `limite`, mostra só as primeiras e um botão para ver todas.
 */
export function ListaDeMudancas({ mudancas, campos = [], limite }: ListaDeMudancasProps) {
  const idDaLista = useId()
  const [expandida, setExpandida] = useState(false)

  const emOrdem = agruparMudancas(mudancas).flatMap((grupo) => grupo.mudancas)
  if (emOrdem.length === 0) return null

  const temCorte = limite !== undefined && emOrdem.length > limite
  const visiveis = temCorte && !expandida ? emOrdem.slice(0, limite) : emOrdem

  return (
    <div className="flex flex-col gap-3">
      <ul id={idDaLista} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visiveis.map((mudanca, indice) => (
          <CartaoDaMudanca
            key={`${mudanca.tipo}-${mudanca.antes ?? ''}-${mudanca.depois ?? ''}-${String(indice)}`}
            mudanca={mudanca}
            campos={campos}
          />
        ))}
      </ul>

      {temCorte && (
        <button
          type="button"
          aria-expanded={expandida}
          aria-controls={idDaLista}
          onClick={() => setExpandida((atual) => !atual)}
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded px-1 text-sm font-bold text-primary-medium hover:underline"
        >
          {expandida ? 'Mostrar menos' : `Ver todas as ${String(emOrdem.length)} mudanças`}
          <span aria-hidden="true">{expandida ? '↑' : '↓'}</span>
        </button>
      )}
    </div>
  )
}
