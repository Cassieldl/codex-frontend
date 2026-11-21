import { useMemo } from 'react'
import { CLASSE_CARD } from '../../../components/ui/classesDeCard'
import { cn } from '../../../lib/cn'
import type { AvisoPublico } from '../types/provedor'
import { useAvisoDestacadoPorAncora } from '../utils/avisoAncora'
import { ordenarAvisosPorGravidade } from '../utils/resumoDoAviso'
import { AvisoPublicoItem } from './AvisoPublicoItem'

interface CartaoDeAvisosProps {
  idDoTitulo: string
  titulo: string
  subtitulo: string
  avisos: AvisoPublico[]
}

/**
 * Card da lateral com uma lista compacta de avisos, do mais grave para o mais leve. Cada lista só
 * destaca e rola até o aviso que é dela, porque a página pode ter duas (provedor e versão).
 */
export function CartaoDeAvisos({ idDoTitulo, titulo, subtitulo, avisos }: CartaoDeAvisosProps) {
  const avisoDestacado = useAvisoDestacadoPorAncora(avisos)
  const avisosPorGravidade = useMemo(() => ordenarAvisosPorGravidade(avisos), [avisos])

  if (avisos.length === 0) return null

  return (
    <section aria-labelledby={idDoTitulo} className={cn(CLASSE_CARD, 'p-5 shadow-card')}>
      <h2 id={idDoTitulo} className="text-card-titulo font-bold text-primary">
        {titulo}
      </h2>
      <p className="mt-1 text-xs text-muted">{subtitulo}</p>

      <ul className="mt-3.5 flex flex-col">
        {avisosPorGravidade.map((aviso) => (
          <AvisoPublicoItem key={aviso.id} aviso={aviso} destacado={aviso.id === avisoDestacado} />
        ))}
      </ul>
    </section>
  )
}
