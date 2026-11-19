import type { AvisoPublico, SeveridadeAviso } from '../types/provedor'

const PESO_DA_SEVERIDADE: Record<SeveridadeAviso, number> = {
  Critico: 0,
  Alerta: 1,
  Informativo: 2,
}

/** Crítico, atenção e informação, nessa ordem. Empate mantém a ordem que a API mandou. */
export function ordenarAvisosPorGravidade<Aviso extends Pick<AvisoPublico, 'severidade'>>(
  avisos: readonly Aviso[],
): Aviso[] {
  return avisos
    .map((aviso, posicao) => ({ aviso, posicao }))
    .sort(
      (a, b) =>
        PESO_DA_SEVERIDADE[a.aviso.severidade] - PESO_DA_SEVERIDADE[b.aviso.severidade] ||
        a.posicao - b.posicao,
    )
    .map(({ aviso }) => aviso)
}
