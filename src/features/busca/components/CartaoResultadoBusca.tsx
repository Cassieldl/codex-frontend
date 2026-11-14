import { Link, type LinkProps } from '@tanstack/react-router'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import type { ResultadoItem } from '../types/resultadoBusca'
import { formatarMetaResultado } from '../utils/formatarMetaResultado'
import { resolverTituloDoCartao, trechosQueAcrescentam } from '../utils/trechoAcrescenta'
import { ResultadoErroGeral } from './ResultadoErroGeral'
import { TrechosDestacados } from './TrechosDestacados'

export interface CartaoResultadoBuscaProps {
  item: ResultadoItem
}

const CLASSE_DO_CARTAO = 'flex flex-col gap-1 rounded-[var(--radius-card)] border border-border p-4'

function ConteudoDoCartao({ item }: CartaoResultadoBuscaProps) {
  const ehErro = item.tipo === 'erro'
  const codigo = ehErro ? item.chave : null
  const meta = formatarMetaResultado(item.meta)
  // O que o cartão mostra além do título: do trecho, só entra o que ainda não está aqui.
  const outrosTextosVisiveis = [
    codigo,
    ehErro ? item.solucaoResumo : null,
    ehErro ? item.provedorNome : null,
    ehErro ? item.versaoRotulo : null,
  ]
  const titulo = resolverTituloDoCartao(item.titulo, codigo, item.trechos, outrosTextosVisiveis)
  const trechosNovos = trechosQueAcrescentam(titulo.trechos, [
    titulo.titulo.map((parte) => parte.texto).join(''),
    ...outrosTextosVisiveis,
  ])

  return (
    <div className="flex items-start gap-3">
      {codigo && (
        <span className="shrink-0 rounded-[var(--radius-control)] border border-border bg-white px-2 py-0.5 font-mono text-sm font-bold text-primary">
          {codigo}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          {/* Título de erro pode ser um caminho XML sem espaço: sem a quebra, estoura 390 px. */}
          <span className="min-w-0 text-card-titulo font-medium text-ink [overflow-wrap:anywhere]">
            {titulo.veioDoTrecho ? <TrechosDestacados trechos={titulo.titulo} /> : item.titulo}
          </span>
          {ehErro && (
            <ResultadoErroGeral
              provedorNome={item.provedorNome}
              versaoRotulo={item.versaoRotulo}
              versoes={item.versoes}
            />
          )}
        </div>

        {trechosNovos.length > 0 && (
          <p className="text-sm text-ink [overflow-wrap:anywhere]">
            <TrechosDestacados trechos={trechosNovos} />
          </p>
        )}

        {ehErro && (
          <p data-solucao-resumo="" className="text-sm text-ink [overflow-wrap:anywhere]">
            <span className="font-semibold">Solução:</span>{' '}
            {item.solucaoResumo ?? <span className="text-muted">ainda não documentada</span>}
          </p>
        )}

        {meta && <p className="text-xs text-muted">{meta}</p>}
      </div>
    </div>
  )
}

/**
 * Um resultado da busca pública. No erro, o código abre o cartão e o provedor fica ao lado do
 * título: o mesmo código existe em provedores diferentes, e é isso que decide qual abrir. A
 * primeira linha da solução já vem no cartão.
 *
 * A `url` vem da API como string livre: `caminhoInternoSeguro` valida antes de virar sink de
 * navegação (BAIXO-02); se não passar, o cartão renderiza sem link.
 */
export function CartaoResultadoBusca({ item }: CartaoResultadoBuscaProps) {
  const caminho = caminhoInternoSeguro(item.url)

  if (!caminho) {
    return (
      <div className={CLASSE_DO_CARTAO}>
        <ConteudoDoCartao item={item} />
      </div>
    )
  }

  return (
    <Link
      to={caminho as unknown as LinkProps['to']}
      className={`${CLASSE_DO_CARTAO} hover:shadow-hover`}
    >
      <ConteudoDoCartao item={item} />
    </Link>
  )
}
