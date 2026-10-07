import { z } from 'zod'
import { LIMITES_LACUNA_BUSCA } from './lacunaBusca'

/**
 * Nota opcional da decisão (o que foi feito, ou por que foi descartada). O limite é medido sobre
 * o texto aparado, como o validator do backend.
 */
export const decisaoLacunaBuscaSchema = z.object({
  nota: z
    .string()
    .refine(
      (valor) => valor.trim().length <= LIMITES_LACUNA_BUSCA.nota,
      `Máximo de ${LIMITES_LACUNA_BUSCA.nota} caracteres.`,
    ),
})

export type DecisaoLacunaBuscaValores = z.infer<typeof decisaoLacunaBuscaSchema>
