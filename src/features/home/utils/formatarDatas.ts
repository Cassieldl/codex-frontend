import { format, parseISO } from 'date-fns'

/**
 * `yyyy-MM-dd` → `dd/MM/yyyy`. Sempre via `parseISO`, nunca `new Date(iso)`:
 * o construtor interpreta data sem horário como UTC e devolve o dia anterior
 * em qualquer fuso a oeste de Greenwich — que é o fuso de todo usuário do
 * Codex.
 */
export function formatarDataCurta(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy')
}

/** ISO com horário → `dd/MM/yyyy, HH:mm` (expiração de comunicado). */
export function formatarDataHora(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy', 'HH:mm")
}
