import { useMemo } from 'react'
import type { AvisoPublico } from '../types/provedor'
import { useAvisoDestacadoPorAncora } from '../utils/avisoAncora'
import { ordenarAvisosPorGravidade } from '../utils/resumoDoAviso'
import { AvisoPublicoItem } from './AvisoPublicoItem'

export interface AvisosVersaoProps {
  avisos: AvisoPublico[]
}

/**
 * Seção "Avisos desta versão", renderizada dentro do conteúdo da aba (`$versaoSlug.tsx`) e
 * distinta de "Avisos do provedor" (`AvisosProvedor`) por rótulo de seção e posição (U8, §7.6.3).
 * Ordem por gravidade: crítico, atenção, informação.
 */
export function AvisosVersao({ avisos }: AvisosVersaoProps) {
  const avisoDestacado = useAvisoDestacadoPorAncora(avisos)
  const avisosPorGravidade = useMemo(() => ordenarAvisosPorGravidade(avisos), [avisos])

  if (avisos.length === 0) return null

  return (
    <section aria-labelledby="avisos-versao-titulo" className="flex flex-col gap-3">
      <h2 id="avisos-versao-titulo" className="text-subtitulo font-semibold text-ink">
        Avisos desta versão
      </h2>

      <ul className="flex flex-col gap-2">
        {avisosPorGravidade.map((aviso) => (
          <AvisoPublicoItem key={aviso.id} aviso={aviso} destacado={aviso.id === avisoDestacado} />
        ))}
      </ul>
    </section>
  )
}
