import { format, parseISO } from 'date-fns'
import type { MetaResultado } from '../types/resultadoBusca'

/**
 * Traduz `item.meta` estruturado (P-12) para o texto exibido na linha de
 * resultado. Formato compacto (`dd/MM/yyyy`) — diferente do `SeloVerificacao`
 * (data por extenso), porque o espaço da linha de resultado é mais estreito;
 * não vale reusar o componente inteiro só por isso (`analise-frontend.md` §6.1).
 */
export function formatarMetaResultado(meta: MetaResultado | null): string | null {
  if (!meta) return null

  if (meta.tipo === 'verificacao') {
    // `parseISO` (não `new Date`) — data pura "AAAA-MM-DD" sem horário vira
    // meia-noite LOCAL, não UTC; `new Date(string)` trataria como UTC e
    // exibiria o dia anterior em fusos negativos (ex.: America/Sao_Paulo).
    return `Verificado em ${format(parseISO(meta.data), 'dd/MM/yyyy')}`
  }

  return null
}
