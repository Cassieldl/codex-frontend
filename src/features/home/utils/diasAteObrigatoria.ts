import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'

/**
 * Dias de calendário até a data em que a versão fica obrigatória. `null` quando não há data ou o
 * prazo já chegou: o selo "Faltam N dias" só existe enquanto há contagem regressiva.
 */
export function diasAteObrigatoria(
  obrigatoriaEm: string | null,
  hoje: Date = new Date(),
): number | null {
  if (!obrigatoriaEm) return null

  const prazo = parseISO(obrigatoriaEm)
  if (!isValid(prazo)) return null

  const dias = differenceInCalendarDays(prazo, hoje)

  return dias > 0 ? dias : null
}

export function rotuloDiasRestantes(dias: number): string {
  return dias === 1 ? 'Falta 1 dia' : `Faltam ${dias} dias`
}
