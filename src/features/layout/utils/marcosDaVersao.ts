import { format, isValid, parseISO, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { MarcosDaVersaoLayout } from '../types/layoutPublico'

export type ChaveDoMarco = 'homologacao' | 'liberacao' | 'obrigatoriedade'

export interface MarcoDaVersao {
  chave: ChaveDoMarco
  rotulo: string
  /** `yyyy-MM-dd`, para o `dateTime` do `<time>`. */
  dataIso: string
  /** Data como a tela mostra: mês e ano na homologação, dia completo nos outros. */
  texto: string
  /** O marco já chegou: a data é hoje ou anterior. */
  passou: boolean
}

export interface LinhaDoTempoDaVersao {
  /** Marcos com data, em ordem cronológica. */
  marcos: MarcoDaVersao[]
  /** Quantos marcos vêm antes de hoje: a marca de hoje entra nessa posição. */
  posicaoDeHoje: number
}

interface DefinicaoDoMarco {
  chave: ChaveDoMarco
  campo: keyof Omit<MarcosDaVersaoLayout, 'normaOrigem'>
  rotulo: string
  formato: string
}

const DEFINICOES: DefinicaoDoMarco[] = [
  { chave: 'homologacao', campo: 'homologacaoDesde', rotulo: 'Homologação', formato: 'MMM/yyyy' },
  {
    chave: 'liberacao',
    campo: 'liberadaNoInvoicyEm',
    rotulo: 'Liberada no InvoiCy',
    formato: 'dd/MM/yyyy',
  },
  {
    chave: 'obrigatoriedade',
    campo: 'obrigatoriaEm',
    rotulo: 'Obrigatória em produção',
    formato: 'dd/MM/yyyy',
  },
]

/**
 * Marcos da versão do layout que têm data válida, em ordem cronológica, e a posição de hoje entre
 * eles. Sem nenhuma data devolve `null`: a linha do tempo inteira some. `parseISO` lê a data no
 * fuso local, então 01/12 continua 01/12 a oeste de Greenwich.
 */
export function montarLinhaDoTempo(
  datas: Partial<MarcosDaVersaoLayout>,
  hoje: Date,
): LinhaDoTempoDaVersao | null {
  const inicioDeHoje = startOfDay(hoje)

  const marcos = DEFINICOES.flatMap((definicao) => {
    const valor = datas[definicao.campo]
    if (!valor) return []

    const data = parseISO(valor)
    if (!isValid(data)) return []

    return [
      {
        momento: data.getTime(),
        marco: {
          chave: definicao.chave,
          rotulo: definicao.rotulo,
          dataIso: valor,
          texto: format(data, definicao.formato, { locale: ptBR }),
          passou: data.getTime() <= inicioDeHoje.getTime(),
        },
      },
    ]
  })

  if (marcos.length === 0) return null

  const ordenados = marcos.sort((primeiro, segundo) => primeiro.momento - segundo.momento)

  return {
    marcos: ordenados.map(({ marco }) => marco),
    posicaoDeHoje: ordenados.filter(({ marco }) => marco.passou).length,
  }
}

/** `dd/MM/yyyy` de uma data `yyyy-MM-dd`; `null` sem data ou com data inválida. */
export function formatarDataDoMarco(valor: string | null | undefined): string | null {
  if (!valor) return null
  const data = parseISO(valor)
  return isValid(data) ? format(data, 'dd/MM/yyyy') : null
}
