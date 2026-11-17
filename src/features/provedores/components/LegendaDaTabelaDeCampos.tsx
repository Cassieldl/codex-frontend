import { TriangleAlert } from 'lucide-react'
import { LegendaDeMarcas } from '../../../components/ui/LegendaDeMarcas'
import type { ItemDaLegendaDeMarcas } from '../../../components/ui/LegendaDeMarcas'
import { SeloReformaTributaria } from '../../../components/ui/SeloReformaTributaria'
import { ORDEM_DA_OBRIGATORIEDADE, ROTULO_DA_OBRIGATORIEDADE } from '../utils/obrigatoriedade'
import { CLASSE_DO_SELO_DE_REJEICOES } from './IndicadorErrosDoCampo'
import { FormaDoMarcador } from './MarcadorObrigatoriedade'

export interface LegendaDaTabelaDeCamposProps {
  /** Campos da versão com rejeição registrada; sem nenhum, a marca não aparece na legenda. */
  camposComRejeicao: number
  /** A versão tem campo da reforma tributária: a legenda explica o selo também. */
  mostrarReformaTributaria: boolean
}

function descreverCamposComRejeicao(quantidade: number): string {
  return quantidade === 1 ? '1 campo' : `${quantidade} campos`
}

function itensDaLegenda({
  camposComRejeicao,
  mostrarReformaTributaria,
}: LegendaDaTabelaDeCamposProps): ItemDaLegendaDeMarcas[] {
  const itens: ItemDaLegendaDeMarcas[] = ORDEM_DA_OBRIGATORIEDADE.map((estado) => ({
    chave: estado,
    marca: (
      <span className="inline-flex size-2.5">
        <FormaDoMarcador estado={estado} />
      </span>
    ),
    significado: ROTULO_DA_OBRIGATORIEDADE[estado].toLowerCase(),
  }))

  if (camposComRejeicao > 0) {
    itens.push({
      chave: 'rejeicoes',
      marca: (
        <span className={CLASSE_DO_SELO_DE_REJEICOES}>
          <TriangleAlert className="size-3 shrink-0" />n
        </span>
      ),
      significado: `campo com rejeição registrada nesta versão, n é a quantidade (${descreverCamposComRejeicao(camposComRejeicao)})`,
    })
  }

  if (mostrarReformaTributaria) {
    itens.push({
      chave: 'reforma',
      marca: <SeloReformaTributaria />,
      significado: 'campo da reforma tributária (IBS/CBS)',
    })
  }

  return itens
}

/** Legenda única das marcas da tabela de campos. */
export function LegendaDaTabelaDeCampos(props: LegendaDaTabelaDeCamposProps) {
  return <LegendaDeMarcas itens={itensDaLegenda(props)} />
}
