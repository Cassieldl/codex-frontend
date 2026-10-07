import type { AvisoPublico } from '../types/provedor'
import { useAvisoDestacadoPorAncora } from '../utils/avisoAncora'
import { AvisoPublicoItem } from './AvisoPublicoItem'

export interface AvisosVersaoProps {
  avisos: AvisoPublico[]
}

/**
 * Seção "Avisos desta versão" — renderizada dentro do conteúdo da aba
 * (`$versaoSlug.tsx`), distinta de "Avisos do provedor" (`AvisosProvedor`,
 * sempre visível no `route.tsx` pai) por rótulo de seção e posição (U8,
 * §7.6.3). A API já ordena por severidade (Crítico no topo).
 */
export function AvisosVersao({ avisos }: AvisosVersaoProps) {
  const avisoDestacado = useAvisoDestacadoPorAncora(avisos)

  if (avisos.length === 0) return null

  return (
    <section aria-labelledby="avisos-versao-titulo" className="flex flex-col gap-3">
      <h2 id="avisos-versao-titulo" className="text-subtitulo font-semibold text-ink">
        Avisos desta versão
      </h2>

      <ul className="flex flex-col gap-3">
        {avisos.map((aviso) => (
          <AvisoPublicoItem key={aviso.id} aviso={aviso} destacado={aviso.id === avisoDestacado} />
        ))}
      </ul>
    </section>
  )
}
