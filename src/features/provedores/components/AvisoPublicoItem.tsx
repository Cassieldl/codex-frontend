import clsx from 'clsx'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { EtiquetaSeveridade } from '../../../components/ui/EtiquetaSeveridade'
import { formatarDataVerificacao } from '../../../utils/formatarDataVerificacao'
import type { AvisoPublico } from '../types/provedor'
import { construirIdAviso, construirLinkAviso } from '../utils/avisoAncora'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import { mapearSeveridade } from '../utils/mapearSeveridade'

export interface AvisoPublicoItemProps {
  aviso: AvisoPublico
  /** O aviso que a âncora da URL aponta — recebe o mesmo realce da linha de campo destacada. */
  destacado?: boolean
}

/**
 * Um aviso publicado, com âncora própria (`#aviso-{id}`) e link copiável. Compartilhado pelas
 * listas de provedor e de versão: o que as distingue é o rótulo da seção, não o cartão.
 *
 * Os campos afetados linkam para a linha do campo na tabela da mesma página (`#campo-{slug}`);
 * aviso de provedor nunca os tem, então o bloco simplesmente não aparece.
 */
export function AvisoPublicoItem({ aviso, destacado = false }: AvisoPublicoItemProps) {
  const temCamposAfetados = aviso.camposAfetados.length > 0

  return (
    <li
      id={construirIdAviso(aviso.id)}
      className={clsx(
        'scroll-mt-24 rounded-[var(--radius-card)] border border-border p-4',
        destacado && 'border-l-[3px] border-l-accent bg-highlight-anchor',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <EtiquetaSeveridade severidade={mapearSeveridade(aviso.severidade)} />
            <h3 className="text-card-titulo font-medium text-ink">{aviso.titulo}</h3>
          </div>

          {/* O corpo chega em parágrafos (`\n\n`) e listas (`\n- `): sem isto, tudo vira uma linha. */}
          <p className="mt-2 text-sm whitespace-pre-line text-ink/80">{aviso.corpo}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {temCamposAfetados && (
              <>
                <span className="font-medium text-muted">Campos afetados</span>
                <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {aviso.camposAfetados.map((campo) => (
                    <li key={campo.campoLayoutSlug}>
                      <a
                        href={`#${construirIdLinhaCampo(campo.campoLayoutSlug)}`}
                        title={campo.caminhoXml}
                        className="rounded font-mono font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
                      >
                        {campo.nome}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <span className="text-muted tabular-nums">
              desde {formatarDataVerificacao(aviso.vigenciaInicio)}
            </span>
          </div>
        </div>

        <BotaoCopiar
          compacto
          icone="link"
          valor={() =>
            construirLinkAviso(window.location.origin, window.location.pathname, aviso.id)
          }
          rotulo="Copiar link"
          ariaLabel={`Copiar link do aviso ${aviso.titulo}`}
        />
      </div>
    </li>
  )
}
