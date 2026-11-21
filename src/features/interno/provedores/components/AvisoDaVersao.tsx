import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { ConteudoArtigo } from '../../../../components/ui/ConteudoArtigo'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { EtiquetaSeveridade, type Severidade } from '../../../../components/ui/EtiquetaSeveridade'
import { cn } from '../../../../lib/cn'
import type { AvisoAdmin } from '../types/avisoAdmin'

const SEVERIDADE_PARA_TOKEN: Record<AvisoAdmin['severidade'], Severidade> = {
  Critico: 'critico',
  Alerta: 'alerta',
  Informativo: 'informativo',
}

export interface AvisoDaVersaoProps {
  aviso: AvisoAdmin
  /** A versão está no ar: sem ela, o aviso publicado fica oculto. */
  versaoPublicadaEfetiva: boolean
  rotuloVersao: string
  /** Botões do aviso aberto. Ficam na página, junto do diálogo que confirma a remoção. */
  acoes: ReactNode
  erroDePublicacao: string | null
}

/**
 * Aviso da versão recolhido por padrão: o cabeçalho mostra severidade, título e estado, e o
 * corpo e as ações só aparecem ao abrir. Padrão de acordeão do ARIA (título com botão
 * `aria-expanded`).
 */
export function AvisoDaVersao({
  aviso,
  versaoPublicadaEfetiva,
  rotuloVersao,
  acoes,
  erroDePublicacao,
}: AvisoDaVersaoProps) {
  const [aberto, setAberto] = useState(false)
  const idDoPainel = useId()

  return (
    <li className="rounded-[var(--radius-card)] border border-border">
      <h3>
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={idDoPainel}
          onClick={() => setAberto((anterior) => !anterior)}
          className="flex w-full items-center gap-3 rounded-[var(--radius-card)] px-4 py-3 text-left transition-shadow duration-150 hover:shadow-hover"
        >
          <EtiquetaSeveridade
            severidade={SEVERIDADE_PARA_TOKEN[aviso.severidade]}
            className="shrink-0"
          />
          <span className="min-w-0 flex-1 text-card-titulo font-medium text-ink">
            {aviso.titulo}
          </span>
          <EtiquetaPublicacao
            className="shrink-0"
            publicadoProprio={aviso.publicado}
            publicadoEfetivo={aviso.publicado && versaoPublicadaEfetiva}
            motivoOculto={!versaoPublicadaEfetiva ? rotuloVersao : undefined}
          />
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-muted transition-transform',
              aberto && 'rotate-180',
            )}
          />
        </button>
      </h3>

      <div id={idDoPainel} hidden={!aberto} className="flex flex-col gap-3 px-4 pb-4">
        <ConteudoArtigo corpo={aviso.corpo} variante="aviso" />

        <div className="flex gap-2">{acoes}</div>
      </div>

      {/* Fora do painel: a falha de publicar precisa aparecer mesmo com o aviso recolhido. */}
      {erroDePublicacao && (
        <p role="alert" className="px-4 pb-4 text-sm text-error-texto">
          {erroDePublicacao}
        </p>
      )}
    </li>
  )
}
