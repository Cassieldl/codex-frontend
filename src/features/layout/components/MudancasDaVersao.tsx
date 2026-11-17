import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useId, useMemo } from 'react'
import { extrairNumeroDaVersao, formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type {
  CampoLayoutPublico,
  GrupoCamposLayout,
  LayoutVersaoResumo,
} from '../types/layoutPublico'
import { contarMudancasDaVersao, rotulosDosChips } from '../utils/mudancasDaVersao'
import { ContadoresDeMudanca } from './ContadoresDeMudanca'
import { ListaDeMudancas } from './ListaDeMudancas'
import type { AncoraDoCampo } from './ListaDeMudancas'
import { NotaDaVersao } from './NotaDaVersao'
import { OrigemDaVersao } from './OrigemDaVersao'

export interface MudancasDaVersaoProps {
  versao: LayoutVersaoResumo
  anterior: LayoutVersaoResumo
  descricao: string | null
  camposPorGrupo: GrupoCamposLayout[]
  /** Abre o verbete na própria página; sem ela, o link vai para a URL canônica do campo. */
  ancoraDoCampo?: AncoraDoCampo
}

interface CamposMudados {
  todos: CampoLayoutPublico[]
  novos: CampoLayoutPublico[]
  saidos: CampoLayoutPublico[]
}

function separarMudados(camposPorGrupo: GrupoCamposLayout[]): CamposMudados {
  const todos = camposPorGrupo.flatMap((grupo) => grupo.campos)
  return {
    todos,
    novos: todos.filter((campo) => campo.novoNestaVersao),
    saidos: todos.filter((campo) => campo.descontinuadoNestaVersao),
  }
}

const CLASSE_DO_CHIP =
  'inline-flex items-center rounded-[var(--radius-pill)] border border-border bg-white px-2.5 py-0.5 font-mono text-xs font-semibold text-primary-medium [overflow-wrap:anywhere] hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'

interface ChipsDeCamposProps {
  rotulo: string
  campos: CampoLayoutPublico[]
  ancoraDoCampo?: AncoraDoCampo
}

function ChipsDeCampos({ rotulo, campos, ancoraDoCampo }: ChipsDeCamposProps) {
  const rotulos = useMemo(() => rotulosDosChips(campos), [campos])
  if (campos.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-3">
      <h3 className="w-20 shrink-0 text-sm font-semibold text-ink sm:pt-1">{rotulo}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {campos.map((campo) => (
          <li key={campo.slug}>
            {ancoraDoCampo ? (
              <a
                href={ancoraDoCampo(campo.slug)}
                title={campo.caminhoXml}
                className={CLASSE_DO_CHIP}
              >
                {rotulos.get(campo.slug)}
              </a>
            ) : (
              <Link
                to="/layout/campos/$campoSlug"
                params={{ campoSlug: campo.slug }}
                title={campo.caminhoXml}
                className={CLASSE_DO_CHIP}
              >
                {rotulos.get(campo.slug)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * O que a versão mudou em relação à anterior, recolhido numa linha com a origem e os contadores.
 * Aberto, mostra cada mudança como "antes, seta, depois", agrupada por tipo. Versão sem mudanças
 * estruturadas mostra os campos novos e os que saíram em chips, e a nota em texto.
 */
export function MudancasDaVersao({
  versao,
  anterior,
  descricao,
  camposPorGrupo,
  ancoraDoCampo,
}: MudancasDaVersaoProps) {
  const tituloId = useId()
  const { todos, novos, saidos } = useMemo(() => separarMudados(camposPorGrupo), [camposPorGrupo])
  const mudancas = versao.mudancas ?? []
  const comMudancas = mudancas.length > 0
  const campos = useMemo(
    () => todos.map((campo) => ({ slug: campo.slug, caminhoXml: campo.caminhoXml })),
    [todos],
  )
  const contadores = contarMudancasDaVersao(mudancas, {
    novos: novos.length,
    descontinuados: saidos.length,
  })

  return (
    <details
      aria-labelledby={tituloId}
      className="group rounded-[var(--radius-card)] border border-line bg-white"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-card)] px-5 py-3 hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col gap-0.5">
          <h2 id={tituloId} className="text-card-titulo font-semibold text-ink">
            O que mudou da {formatarVersaoLayout(anterior.rotulo)} para a{' '}
            {extrairNumeroDaVersao(versao.rotulo)}
          </h2>
          <OrigemDaVersao normaOrigem={versao.normaOrigem} />
        </div>
        <ContadoresDeMudanca contadores={contadores} />
        <ChevronDown
          aria-hidden="true"
          className="ml-auto size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="flex flex-col gap-4 border-t border-line px-5 py-4">
        {comMudancas ? (
          <>
            <NotaDaVersao descricao={descricao} somenteResumo />
            <ListaDeMudancas mudancas={mudancas} campos={campos} ancoraDoCampo={ancoraDoCampo} />
          </>
        ) : (
          <>
            <ChipsDeCampos rotulo="Novos" campos={novos} ancoraDoCampo={ancoraDoCampo} />
            <ChipsDeCampos rotulo="Saíram" campos={saidos} ancoraDoCampo={ancoraDoCampo} />
            <NotaDaVersao descricao={descricao} />
          </>
        )}
      </div>
    </details>
  )
}
