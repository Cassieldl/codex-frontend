import type { Severidade } from '../../../components/ui/EtiquetaSeveridade'
import type { SeveridadeAviso } from '../types/provedor'

const MAPA: Record<SeveridadeAviso, Severidade> = {
  Critico: 'critico',
  Alerta: 'alerta',
  Informativo: 'informativo',
}

/** Converte a severidade do contrato da API (`Critico`/`Alerta`/`Informativo`) para a prop de `EtiquetaSeveridade`. */
export function mapearSeveridade(severidade: SeveridadeAviso): Severidade {
  return MAPA[severidade]
}
