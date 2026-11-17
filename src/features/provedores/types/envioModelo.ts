// Espelha o contrato de `GET /provedores/{provedorSlug}/versoes/{versaoSlug}/envio-modelo`.

import type { NoEstrutura } from '../../layout/types/estruturaLayout'

export const ALCANCES_DO_ENVIO_MODELO = ['minimo', 'maximo'] as const

/** Mínimo: só o que o esquema do provedor obriga. Máximo: tudo que a versão aceita. */
export type AlcanceDoEnvioModelo = (typeof ALCANCES_DO_ENVIO_MODELO)[number]

export const ROTULO_DO_ALCANCE: Record<AlcanceDoEnvioModelo, string> = {
  minimo: 'Mínimo',
  maximo: 'Máximo',
}

export const CENARIOS_DO_ENVIO_MODELO = [
  'nacional',
  'tomador-estrangeiro',
  'exportacao-servico',
  'construcao-civil',
  'retencoes-federais',
] as const

/** Situação que o envio ilustra. O backend devolve só os cenários que a versão aceita. */
export type CenarioDoEnvioModelo = (typeof CENARIOS_DO_ENVIO_MODELO)[number]

export const CENARIO_PADRAO: CenarioDoEnvioModelo = 'nacional'

export const ROTULO_DO_CENARIO: Record<CenarioDoEnvioModelo, string> = {
  nacional: 'Tomador nacional',
  'tomador-estrangeiro': 'Tomador estrangeiro',
  'exportacao-servico': 'Exportação de serviço',
  'construcao-civil': 'Construção civil',
  'retencoes-federais': 'Retenções federais',
}

export function ehCenarioDoEnvioModelo(valor: string): valor is CenarioDoEnvioModelo {
  return (CENARIOS_DO_ENVIO_MODELO as readonly string[]).includes(valor)
}

export interface EnvioModelo {
  alcance: AlcanceDoEnvioModelo
  /** Cenário que gerou este envio. */
  cenario: string
  /** Cenários que a versão tem; sempre traz "nacional". */
  cenariosDisponiveis: string[]
  versaoLayoutRotulo: string
  /** Raiz `Envio`. */
  xml: NoEstrutura
  /** Raiz `Documento`, na convenção REST do InvoiCy. */
  json: NoEstrutura
  /** Slugs de campo do layout que a versão usa e que não têm posição na estrutura. */
  camposSemPosicao: string[]
}
