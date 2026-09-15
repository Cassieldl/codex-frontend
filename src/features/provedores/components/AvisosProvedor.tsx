import { EtiquetaSeveridade } from '../../../components/ui/EtiquetaSeveridade'
import type { AvisoPublico } from '../types/provedor'
import { mapearSeveridade } from '../utils/mapearSeveridade'

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
  if (avisos.length === 0) return null

  return (
    <section aria-labelledby="avisos-provedor-titulo" className="flex flex-col gap-3">
      <header>
        <h2 id="avisos-provedor-titulo" className="text-subtitulo font-semibold text-ink">
          Avisos do provedor
        </h2>
        <p className="text-xs text-ink/60">Valem para {nomeProvedor} em qualquer versão.</p>
      </header>

      <ul className="flex flex-col gap-3">
        {avisos.map((aviso, indice) => (
          <li
            key={`${aviso.titulo}-${indice}`}
            className="rounded-[var(--radius-card)] border border-border p-4"
          >
            <div className="flex items-center gap-2">
              <EtiquetaSeveridade severidade={mapearSeveridade(aviso.severidade)} />
              <h3 className="text-card-titulo font-medium text-ink">{aviso.titulo}</h3>
            </div>
            <p className="mt-2 text-sm text-ink/80">{aviso.corpo}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
