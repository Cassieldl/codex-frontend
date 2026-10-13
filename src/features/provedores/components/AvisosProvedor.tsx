import type { AvisoPublico } from '../types/provedor'
import { useAvisoDestacadoPorAncora } from '../utils/avisoAncora'
import { AvisoPublicoItem } from './AvisoPublicoItem'

export interface AvisosProvedorProps {
  nomeProvedor: string
  avisos: AvisoPublico[]
}

/**
 * Seção "Avisos do provedor" (U8) — renderizada pelo `route.tsx` pai,
 * **sempre visível** acima da barra de abas, independente de qual versão
 * está selecionada. Distinta de "Avisos desta versão" (`AvisosVersao`) por
 * rótulo de seção e posição — a severidade usa a mesma paleta nos dois
 * escopos, de propósito (§3.3b/§7.6.1): quem distingue não é a cor.
 */
export function AvisosProvedor({ nomeProvedor, avisos }: AvisosProvedorProps) {
  const avisoDestacado = useAvisoDestacadoPorAncora(avisos)

  if (avisos.length === 0) return null

  return (
    <section aria-labelledby="avisos-provedor-titulo" className="flex flex-col gap-3">
      <header>
        <h2 id="avisos-provedor-titulo" className="text-subtitulo font-semibold text-ink">
          Avisos do provedor
        </h2>
        <p className="text-xs text-muted">Valem para {nomeProvedor} em qualquer versão.</p>
      </header>

      <ul className="flex flex-col gap-2">
        {avisos.map((aviso) => (
          <AvisoPublicoItem key={aviso.id} aviso={aviso} destacado={aviso.id === avisoDestacado} />
        ))}
      </ul>
    </section>
  )
}
