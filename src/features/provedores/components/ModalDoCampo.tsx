import { useEffect, useMemo, useRef } from 'react'

import { EtiquetaEstado } from '../../../components/ui/EtiquetaEstado'
import { ModalDeCampoNavegavel } from '../../../components/ui/ModalDeCampoNavegavel'
import {
  NOME_DA_REFORMA_TRIBUTARIA,
  SeloReformaTributaria,
} from '../../../components/ui/SeloReformaTributaria'
import type { VizinhoDeCampo } from '../../../types/vizinhoDeCampo'
import type { ModalDoCampoProps, VizinhoDoCampo } from '../types/modalDoCampo'
import { ESTADO_PARA_ETIQUETA } from '../utils/blocosDeCampos'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import { ehCampoNaturezaOperacao } from '../utils/naturezaOperacao'
import { ConteudoDoCampo } from './ConteudoDoCampo'
import { ID_SECAO_REJEICOES } from './RejeicoesDoCampo'
import { TabelaNaturezasOperacao } from './TabelaNaturezasOperacao'

function paraVizinhoDeCampo(vizinho: VizinhoDoCampo | null): VizinhoDeCampo | null {
  return vizinho && { slug: vizinho.campoLayoutSlug, nome: vizinho.nome }
}

/**
 * Detalhe do campo do provedor em modal. A navegação, o link e o rodapé são do
 * `ModalDeCampoNavegavel`; aqui ficam o conteúdo do provedor e a rolagem até a seção pedida.
 */
export function ModalDoCampo({
  campo,
  trilha,
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
    if (secaoInicialRef.current !== 'rejeicoes') return
    document.getElementById(ID_SECAO_REJEICOES)?.scrollIntoView({ block: 'start' })
  }, [])

  return (
    <ModalDeCampoNavegavel
      titulo={campo.nome}
      chave={campo.campoLayoutSlug}
      trilha={trilha}
      aposTitulo={
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <EtiquetaEstado estado={ESTADO_PARA_ETIQUETA[campo.estadoPreenchimento]} />
          {campo.reformaTributaria && (
            <span className="inline-flex items-center gap-2">
              <SeloReformaTributaria />
              <span aria-hidden="true" className="text-aux text-muted">
                {NOME_DA_REFORMA_TRIBUTARIA}
              </span>
            </span>
          )}
        </div>
      }
      posicao={posicao}
      total={total}
      filtroAtivo={filtroAtivo}
      anterior={vizinhoAnterior}
      proximo={vizinhoProximo}
      onNavegar={onNavegar}
      onFechar={onFechar}
      devolverFoco={devolverFoco}
      linkDoCampo={`${urlProvedorAbsoluta}#${construirIdLinhaCampo(campo.campoLayoutSlug)}`}
    >
      <ConteudoDoCampo campo={campo} errosResumo={errosResumo} />

      {ehCampoNaturezaOperacao(campo) && naturezasOperacao.length > 0 && (
        <section aria-labelledby="natureza-no-campo-titulo" className="mt-6 flex flex-col gap-2">
          <h3 id="natureza-no-campo-titulo" className="text-sm font-semibold text-ink">
            De-para da natureza da operação
          </h3>
          <TabelaNaturezasOperacao naturezas={naturezasOperacao} />
        </section>
      )}
    </ModalDeCampoNavegavel>
  )
}
