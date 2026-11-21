import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { ConteudoArtigo } from '../../../components/ui/ConteudoArtigo'
import { EtiquetaSeveridade } from '../../../components/ui/EtiquetaSeveridade'
import { cn } from '../../../lib/cn'
import { formatarDataVerificacao } from '../../../utils/formatarDataVerificacao'
import type { AvisoPublico } from '../types/provedor'
import { construirIdAviso, construirLinkAviso } from '../utils/avisoAncora'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import { mapearSeveridade } from '../utils/mapearSeveridade'

export interface AvisoPublicoItemProps {
  aviso: AvisoPublico
  /** O aviso que a âncora da URL aponta: recebe o mesmo realce da linha de campo destacada. */
  destacado?: boolean
}

/**
 * Um aviso publicado na lista compacta da lateral: ícone do tom e título, com âncora própria
 * (`#aviso-{id}`) e link copiável. O texto inteiro abre ali mesmo, no `<details>` nativo, então a
 * busca do navegador encontra o corpo e abre o aviso.
 *
 * Dois casos abrem sozinhos: o **crítico**, que existe para impedir um erro grave, e o aviso que a
 * âncora da URL aponta. O botão de copiar link aparece com o mouse sobre o aviso, com o foco dentro
 * dele ou com ele aberto. Fica sempre na ordem do Tab, e em tela de toque fica sempre visível.
 */
export function AvisoPublicoItem({ aviso, destacado = false }: AvisoPublicoItemProps) {
  const [aberto, setAberto] = useState(aviso.severidade === 'Critico' || destacado)
  const temCamposAfetados = aviso.camposAfetados.length > 0

  // A âncora pode mudar depois da montagem (link para outro aviso na mesma página).
  useEffect(() => {
    if (destacado) setAberto(true)
  }, [destacado])

  return (
    <li
      id={construirIdAviso(aviso.id)}
      className={cn(
        'group/aviso -mx-2 scroll-mt-24 rounded border-t border-border px-2 py-2.5',
        destacado && 'bg-highlight-anchor',
      )}
    >
      <div className="flex items-start gap-1">
        <details
          open={aberto}
          onToggle={(evento) => setAberto(evento.currentTarget.open)}
          className="group min-w-0 flex-1"
        >
          <summary className="group/resumo grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2.5 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover [&::-webkit-details-marker]:hidden">
            <EtiquetaSeveridade
              severidade={mapearSeveridade(aviso.severidade)}
              somenteIcone
              semFundo
              className="mt-px"
            />
            <h3 className="text-sm leading-snug font-medium text-primary group-hover/resumo:underline">
              {aviso.titulo}
            </h3>
            <ChevronDown
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
            />
          </summary>

          <div className="pt-1 pl-7">
            <ConteudoArtigo corpo={aviso.corpo} variante="aviso" className="mt-1" />

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
                          className="rounded font-mono font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover"
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
        </details>

        <BotaoCopiar
          compacto
          icone="link"
          valor={() =>
            construirLinkAviso(window.location.origin, window.location.pathname, aviso.id)
          }
          rotulo="Copiar link"
          ariaLabel={`Copiar link do aviso ${aviso.titulo}`}
          className={cn(
            'transition-opacity',
            aberto
              ? 'opacity-100'
              : 'opacity-0 group-hover/aviso:opacity-100 group-focus-within/aviso:opacity-100 [@media(hover:none)]:opacity-100',
          )}
        />
      </div>
    </li>
  )
}
