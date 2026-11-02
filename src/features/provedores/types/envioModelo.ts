// Espelha o contrato de `GET /provedores/{provedorSlug}/versoes/{versaoSlug}/envio-modelo`.

import type { NoEstrutura } from '../../layout/types/estruturaLayout'

export const ALCANCES_DO_ENVIO_MODELO = ['minimo', 'maximo'] as const

/** Mínimo: só o que o esquema do provedor obriga. Máximo: tudo que a versão aceita. */
export type AlcanceDoEnvioModelo = (typeof ALCANCES_DO_ENVIO_MODELO)[number]

export const ROTULO_DO_ALCANCE: Record<AlcanceDoEnvioModelo, string> = {
  minimo: 'Mínimo',
  maximo: 'Máximo',
}

export interface EnvioModelo {
  alcance: AlcanceDoEnvioModelo
  versaoLayoutRotulo: string
  /** Raiz `Envio`. */
  xml: NoEstrutura
  /** Raiz `Documento`, na convenção REST do InvoiCy. */
  json: NoEstrutura
  /** Slugs de campo do layout que a versão usa e que não têm posição na estrutura. */
  camposSemPosicao: string[]
}
