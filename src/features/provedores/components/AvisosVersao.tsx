import { EtiquetaSeveridade } from '../../../components/ui/EtiquetaSeveridade'
import type { AvisoPublico } from '../types/provedor'
import { mapearSeveridade } from '../utils/mapearSeveridade'

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
  if (avisos.length === 0) return null

  return (
    <section aria-labelledby="avisos-versao-titulo" className="flex flex-col gap-3">
      <h2 id="avisos-versao-titulo" className="text-subtitulo font-semibold text-ink">
        Avisos desta versão
      </h2>

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
