import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Data sem horário → `Date` no fuso local.
 *
 * Nunca `new Date(iso)`: o construtor lê `2026-03-14` como meia-noite **UTC** e devolve o dia
 * anterior em qualquer fuso a oeste de Greenwich — o de todo usuário do Codex. A lista de
 * provedores exibia 13 de março para uma verificação registrada em 14.
 */
function paraData(data: Date | string): Date {
  return typeof data === 'string' ? parseISO(data) : data
}

/**
 * Data de verificação **por extenso** — `14 de março de 2026`.
 *
 * Usada onde a data é uma afirmação em destaque ou em prosa: o selo de verificação (que sustenta,
 * com a afirmação de exaustividade, a leitura de "campo ausente não se aplica") e o texto corrido.
 * É o formato que os artboards usam no bloco "Verificação" do cabeçalho da versão.
 */
export function formatarDataVerificacao(data: Date | string): string {
  return format(paraData(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

/**
 * Data de verificação **numérica** — `14/03/2026`.
 *
 * Usada onde a data é dado de tabela, comparado linha a linha: a lista de provedores da home e o
 * índice de provedores. Os artboards são explícitos nessa divisão, e ela não é estética — em
 * coluna, a forma compacta é o que deixa as datas comparáveis de relance.
 */
export function formatarDataCurta(data: Date | string): string {
  return format(paraData(data), 'dd/MM/yyyy')
}

/**
 * Frase inteira em cada ramo, nunca só a data: "Em verificação" não é uma data e não pode receber
 * o prefixo "Verificado em" do chamador, senão a lista de provedores mostra "Verificado em Em
 * verificação".
 */
export function rotuloVerificacao(data: string | null): string {
  if (!data) return 'Em verificação'

  return `Verificado em ${formatarDataCurta(data)}`
}
