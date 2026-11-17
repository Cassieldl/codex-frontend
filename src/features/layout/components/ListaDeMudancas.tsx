import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { MudancaDaVersaoLayout } from '../types/layoutPublico'
import { agruparMudancas, caminhoNaoMudou, campoDaMudanca } from '../utils/mudancasDaVersao'
import type { CampoCitavel } from '../utils/mudancasDaVersao'

/**
 * Âncora do verbete na própria página, como `#campo-{slug}`. Sem ela, o link vai para a URL
 * canônica do campo, que abre outra página.
 */
export type AncoraDoCampo = (slug: string) => string

export interface ListaDeMudancasProps {
  mudancas: readonly MudancaDaVersaoLayout[]
  /** Campos do dicionário da versão; sem eles, nenhuma linha vira link. */
  campos?: readonly CampoCitavel[]
  ancoraDoCampo?: AncoraDoCampo
}

const CLASSE_DO_CAMINHO = 'font-mono text-[13px] font-semibold [overflow-wrap:anywhere]'

const CLASSE_DO_LINK =
  'rounded text-primary-medium underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'

interface CaminhoProps {
  texto: string
  slug: string | null
  ancoraDoCampo?: AncoraDoCampo
}

function Caminho({ texto, slug, ancoraDoCampo }: CaminhoProps) {
  if (!slug) return <span className={`${CLASSE_DO_CAMINHO} text-ink`}>{texto}</span>

  const classe = `${CLASSE_DO_CAMINHO} ${CLASSE_DO_LINK}`
  // Na página do dicionário, a âncora abre o verbete sem trocar de página: o "O que mudou"
  // continua aberto e o foco volta ao link quando o verbete fecha.
  if (ancoraDoCampo) {
    return (
      <a href={ancoraDoCampo(slug)} className={classe}>
        {texto}
      </a>
    )
  }

  return (
    <Link to="/layout/campos/$campoSlug" params={{ campoSlug: slug }} className={classe}>
      {texto}
    </Link>
  )
}

interface LinhaDaMudancaProps {
  mudanca: MudancaDaVersaoLayout
  campos: readonly CampoCitavel[]
  ancoraDoCampo?: AncoraDoCampo
}

function LinhaDaMudanca({ mudanca, campos, ancoraDoCampo }: LinhaDaMudancaProps) {
  const slug = campoDaMudanca(mudanca, campos)
  const mesmoCaminho = caminhoNaoMudou(mudanca)
  const comAntes = !mesmoCaminho && mudanca.antes !== null && mudanca.antes.trim() !== ''
  const comDepois = mudanca.depois !== null && mudanca.depois.trim() !== ''

  return (
    <li data-mudanca={mudanca.tipo} className="flex flex-col gap-0.5 py-2">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {comAntes && (
          <Caminho
            texto={mudanca.antes ?? ''}
            slug={mudanca.tipo === 'saiu' ? slug : null}
            ancoraDoCampo={ancoraDoCampo}
          />
        )}
        {comAntes && comDepois && (
          <>
            {' '}
            <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
            <span className="sr-only">passou a ser</span>{' '}
          </>
        )}
        {comDepois && (
          <Caminho
            texto={mudanca.depois ?? ''}
            slug={mudanca.tipo === 'saiu' ? null : slug}
            ancoraDoCampo={ancoraDoCampo}
          />
        )}
      </p>
      {mudanca.descricao && <p className="text-xs text-muted">{mudanca.descricao}</p>}
    </li>
  )
}

/**
 * Mudanças da versão agrupadas por tipo, cada uma como "antes, seta, depois"; com o mesmo caminho
 * dos dois lados, só o caminho. Campo que o dicionário da versão tem leva ao verbete dele.
 */
export function ListaDeMudancas({ mudancas, campos = [], ancoraDoCampo }: ListaDeMudancasProps) {
  const grupos = agruparMudancas(mudancas)
  if (grupos.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {grupos.map((grupo) => (
        <div key={grupo.tipo} data-grupo-de-mudancas={grupo.tipo} className="flex flex-col">
          <h3 className="flex items-baseline gap-2 text-sm font-semibold text-ink">
            {grupo.rotulo}
            <span className="text-xs font-normal text-muted tabular-nums">
              {grupo.mudancas.length}
            </span>
          </h3>
          <ul className="divide-y divide-line">
            {grupo.mudancas.map((mudanca, indice) => (
              <LinhaDaMudanca
                key={`${mudanca.antes ?? ''}-${mudanca.depois ?? ''}-${String(indice)}`}
                mudanca={mudanca}
                campos={campos}
                ancoraDoCampo={ancoraDoCampo}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
