import { format, parseISO } from 'date-fns'

/** ISO com horário → `dd/MM/yyyy, HH:mm` (expiração de comunicado). */
export function formatarDataHora(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy', 'HH:mm")
}
