import { z } from 'zod'

export const ABAS_DA_VERSAO = ['avisos', 'campos', 'exemplos', 'verificacao'] as const

export type AbaDaVersao = (typeof ABAS_DA_VERSAO)[number]

export const ABA_PADRAO_DA_VERSAO: AbaDaVersao = 'avisos'

/** `?aba=` escolhe a visão da versão; valor desconhecido cai na aba padrão em vez de quebrar o link. */
export const versaoSearchSchema = z.object({
  aba: z.enum(ABAS_DA_VERSAO).default(ABA_PADRAO_DA_VERSAO).catch(ABA_PADRAO_DA_VERSAO),
})
