import { TriangleAlert } from 'lucide-react'
import { LegendaDeMarcas } from '../../../components/ui/LegendaDeMarcas'
import type { ItemDaLegendaDeMarcas } from '../../../components/ui/LegendaDeMarcas'
import { SeloReformaTributaria } from '../../../components/ui/SeloReformaTributaria'
import { CLASSE_DO_SELO_DE_REJEICOES } from './IndicadorErrosDoCampo'

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
  // O uso do campo vem escrito na própria etiqueta: só as marcas sem texto entram aqui.
  const itens: ItemDaLegendaDeMarcas[] = []

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
  const itens = itensDaLegenda(props)
  if (itens.length === 0) return null

  return <LegendaDeMarcas itens={itens} />
}
