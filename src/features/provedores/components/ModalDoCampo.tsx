import { Link, useParams } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'

import { ModalDeCampoNavegavel } from '../../../components/ui/ModalDeCampoNavegavel'
import {
  NOME_DA_REFORMA_TRIBUTARIA,
  SeloReformaTributaria,
} from '../../../components/ui/SeloReformaTributaria'
import type { VizinhoDeCampo } from '../../../types/vizinhoDeCampo'
import type { ModalDoCampoProps, VizinhoDoCampo } from '../types/modalDoCampo'
import type { CampoVersaoPublico } from '../types/versaoProvedorPagina'
import { ROTA_DA_ABA } from '../utils/abasDoProvedor'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import { linkDoCampoNoDicionario } from '../utils/linkDoCampoNoDicionario'
import { ehCampoNaturezaOperacao } from '../utils/naturezaOperacao'
import { ConteudoDoCampo } from './ConteudoDoCampo'
import { MarcadorObrigatoriedade } from './MarcadorObrigatoriedade'
import { ID_SECAO_REJEICOES } from './RejeicoesDoCampo'
import { TabelaNaturezasOperacao } from './TabelaNaturezasOperacao'

function paraVizinhoDeCampo(vizinho: VizinhoDoCampo | null): VizinhoDeCampo | null {
  return vizinho && { slug: vizinho.campoLayoutSlug, nome: vizinho.nome }
}

const CLASSE_DO_ATALHO = 'text-sm font-semibold link-texto'

function rolarAteAsRejeicoes(): void {
  document.getElementById(ID_SECAO_REJEICOES)?.scrollIntoView({ block: 'start' })
}

function descreverRejeicoes(quantidade: number): string {
  return quantidade === 1 ? '1 rejeição nesta versão' : `${quantidade} rejeições nesta versão`
}

/** Uso, reforma tributária e rejeições, lado a lado embaixo do nome do campo. */
function SelosDoCampo({ campo }: { campo: CampoVersaoPublico }) {
  const quantidadeDeRejeicoes = campo.errosConhecidos.length

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <MarcadorObrigatoriedade estado={campo.estadoPreenchimento} />

      {campo.reformaTributaria ? (
        <span className="inline-flex items-center gap-2">
          <SeloReformaTributaria />
          <span aria-hidden="true" className="text-aux text-muted">
            {NOME_DA_REFORMA_TRIBUTARIA}
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center rounded-[var(--radius-check)] border border-border bg-surface-hover px-1.5 py-0.5 text-aux leading-none font-medium text-muted">
          Fora da reforma tributária
        </span>
      )}

      {quantidadeDeRejeicoes > 0 && (
        <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-alert-warning-borda bg-alert-warning px-2 py-0.5 text-aux leading-none font-semibold text-alert-warning-texto">
          <TriangleAlert aria-hidden="true" className="size-3 text-alert-warning-icone" />
          {descreverRejeicoes(quantidadeDeRejeicoes)}
        </span>
      )}
    </div>
  )
}

/**
 * Atalhos fixos no rodapé. "Ver os erros" fica dentro do modal: rola até as rejeições e leva o foco
 * ao título delas. O envio modelo existe em toda versão; o link só depende do slug do provedor.
 */
function AtalhosDoCampo({ campo }: { campo: CampoVersaoPublico }) {
  const { provedorSlug } = useParams({ strict: false })
  const noDicionario = linkDoCampoNoDicionario(campo)
  const quantidadeDeErros = campo.errosConhecidos.length

  function irParaAsRejeicoes() {
    rolarAteAsRejeicoes()
    document
      .querySelector<HTMLElement>(`#${ID_SECAO_REJEICOES} [data-titulo-das-rejeicoes]`)
      ?.focus({ preventScroll: true })
  }

  if (quantidadeDeErros === 0 && !noDicionario && !provedorSlug) return null

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {quantidadeDeErros > 0 && (
        <button type="button" onClick={irParaAsRejeicoes} className={CLASSE_DO_ATALHO}>
          {quantidadeDeErros === 1 ? 'Ver o erro' : `Ver os ${quantidadeDeErros} erros`}{' '}
          <span aria-hidden="true">→</span>
        </button>
      )}

      {(noDicionario || provedorSlug) && (
        <nav aria-label="Ver o campo em outras páginas" className="flex flex-wrap gap-x-5 gap-y-1">
          {noDicionario && (
            <Link to={noDicionario.to} params={noDicionario.params} className={CLASSE_DO_ATALHO}>
              No dicionário
            </Link>
          )}
          {provedorSlug && (
            <Link to={ROTA_DA_ABA.envio} params={{ provedorSlug }} className={CLASSE_DO_ATALHO}>
              No envio modelo
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}

/**
 * Detalhe do campo do provedor em modal. A navegação, o link do campo e o rodapé são do
 * `ModalDeCampoNavegavel`; aqui ficam os selos, o conteúdo do provedor, os atalhos e a rolagem até
 * a seção pedida.
 */
export function ModalDoCampo({
  campo,
  trilha,
  provedorNome,
  versaoRotulo,
  posicao,
  total,
  filtroAtivo,
  anterior,
  proximo,
  secaoInicial,
  onNavegar,
  onFechar,
  devolverFoco,
  errosResumo,
  urlProvedorAbsoluta,
  naturezasOperacao = [],
}: ModalDoCampoProps) {
  const secaoInicialRef = useRef(secaoInicial)
  const vizinhoAnterior = useMemo(() => paraVizinhoDeCampo(anterior), [anterior])
  const vizinhoProximo = useMemo(() => paraVizinhoDeCampo(proximo), [proximo])

  // Só na abertura: navegar entre campos volta sempre ao topo.
  useEffect(() => {
    if (secaoInicialRef.current === 'rejeicoes') rolarAteAsRejeicoes()
  }, [])

  return (
    <ModalDeCampoNavegavel
      titulo={campo.nome}
      chave={campo.campoLayoutSlug}
      trilha={`${trilha} · ${provedorNome} ${versaoRotulo}`}
      aposTitulo={<SelosDoCampo campo={campo} />}
      posicao={posicao}
      total={total}
      filtroAtivo={filtroAtivo}
      anterior={vizinhoAnterior}
      proximo={vizinhoProximo}
      onNavegar={onNavegar}
      onFechar={onFechar}
      devolverFoco={devolverFoco}
      linkDoCampo={`${urlProvedorAbsoluta}#${construirIdLinhaCampo(campo.campoLayoutSlug)}`}
      acoesDoRodape={<AtalhosDoCampo campo={campo} />}
    >
      <ConteudoDoCampo
        campo={campo}
        errosResumo={errosResumo}
        naturezasOperacao={naturezasOperacao}
      />

      {ehCampoNaturezaOperacao(campo) && naturezasOperacao.length > 0 && (
        <section aria-labelledby="natureza-no-campo-titulo" className="mt-5 flex flex-col gap-2">
          <h3 id="natureza-no-campo-titulo" className="text-sm font-semibold text-ink">
            De-para da natureza da operação
          </h3>
          <TabelaNaturezasOperacao naturezas={naturezasOperacao} />
        </section>
      )}
    </ModalDeCampoNavegavel>
  )
}
