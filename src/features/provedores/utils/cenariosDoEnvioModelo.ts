import {
  CENARIO_PADRAO,
  CENARIOS_DO_ENVIO_MODELO,
  ehCenarioDoEnvioModelo,
} from '../types/envioModelo'
import type { CenarioDoEnvioModelo } from '../types/envioModelo'

/**
 * Cenários que a tela oferece, na ordem fixa da tela. Valor que esta versão do front não conhece
 * fica de fora, e o nacional entra sempre: é o padrão do backend mesmo que a lista venha sem ele.
 */
export function cenariosParaEscolha(recebidos: readonly string[]): CenarioDoEnvioModelo[] {
  const conhecidos = new Set(recebidos.filter(ehCenarioDoEnvioModelo))
  conhecidos.add(CENARIO_PADRAO)
  return CENARIOS_DO_ENVIO_MODELO.filter((cenario) => conhecidos.has(cenario))
}

export function mesmosCenarios(
  primeiros: readonly CenarioDoEnvioModelo[],
  segundos: readonly CenarioDoEnvioModelo[],
): boolean {
  return (
    primeiros.length === segundos.length &&
    primeiros.every((cenario, indice) => cenario === segundos[indice])
  )
}
