import { useEffect, useMemo, useRef } from 'react'

import { EtiquetaEstado } from '../../../components/ui/EtiquetaEstado'
import { ModalDeCampoNavegavel } from '../../../components/ui/ModalDeCampoNavegavel'
import type { VizinhoDeCampo } from '../../../types/vizinhoDeCampo'
import type { ModalDoCampoProps, VizinhoDoCampo } from '../types/modalDoCampo'
import { ESTADO_PARA_ETIQUETA } from '../utils/blocosDeCampos'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import { ConteudoDoCampo } from './ConteudoDoCampo'
import { ID_SECAO_REJEICOES } from './RejeicoesDoCampo'

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
  urlVersaoAbsoluta,
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
        <EtiquetaEstado estado={ESTADO_PARA_ETIQUETA[campo.estadoPreenchimento]} className="mt-2" />
      }
      posicao={posicao}
      total={total}
      filtroAtivo={filtroAtivo}
      anterior={vizinhoAnterior}
      proximo={vizinhoProximo}
      onNavegar={onNavegar}
      onFechar={onFechar}
      devolverFoco={devolverFoco}
      linkDoCampo={`${urlVersaoAbsoluta}#${construirIdLinhaCampo(campo.campoLayoutSlug)}`}
    >
      <ConteudoDoCampo campo={campo} errosResumo={errosResumo} />
    </ModalDeCampoNavegavel>
  )
}
