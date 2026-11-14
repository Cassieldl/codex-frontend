import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { ConteudoArtigo } from '../../../components/ui/ConteudoArtigo'
import { EtiquetaSeveridade } from '../../../components/ui/EtiquetaSeveridade'
import { formatarDataVerificacao } from '../../../utils/formatarDataVerificacao'
import type { AvisoPublico } from '../types/provedor'
import { construirIdAviso, construirLinkAviso } from '../utils/avisoAncora'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import { mapearSeveridade } from '../utils/mapearSeveridade'
import { primeiraFraseDoAviso } from '../utils/resumoDoAviso'

export interface AvisoPublicoItemProps {
  aviso: AvisoPublico
  /** O aviso que a âncora da URL aponta: recebe o mesmo realce da linha de campo destacada. */
  destacado?: boolean
}

/**
 * Um aviso publicado, com âncora própria (`#aviso-{id}`) e link copiável. Compartilhado pelas
 * listas de provedor e de versão: o que as distingue é o rótulo da seção, não o cartão.
 *
 * Fechado, o aviso mostra o título e a primeira frase do corpo, que já diz o essencial. Dois
 * casos abrem sozinhos: o **crítico**, que existe para impedir um erro grave, e o aviso que a
 * âncora da URL aponta. O `<details>` é nativo, então a busca do navegador encontra o texto do
 * corpo e abre o aviso.
 *
 * O botão de copiar link aparece com o mouse sobre o aviso, com o foco dentro dele ou com ele
 * aberto. Fica sempre na ordem do Tab, e em tela de toque fica sempre visível.
 */
export function AvisoPublicoItem({ aviso, destacado = false }: AvisoPublicoItemProps) {
  const [aberto, setAberto] = useState(aviso.severidade === 'Critico' || destacado)
  const primeiraFrase = useMemo(() => primeiraFraseDoAviso(aviso.corpo), [aviso.corpo])
  const temCamposAfetados = aviso.camposAfetados.length > 0

  // A âncora pode mudar depois da montagem (link para outro aviso na mesma página).
  useEffect(() => {
    if (destacado) setAberto(true)
  }, [destacado])

  return (
    <li
      id={construirIdAviso(aviso.id)}
      className={clsx(
        'group/aviso scroll-mt-24 rounded-[var(--radius-card)] border border-border px-4 py-3',
        destacado && 'border-l-[3px] border-l-accent bg-highlight-anchor',
      )}
    >
      <div className="flex items-start gap-3">
        <details
          open={aberto}
          onToggle={(evento) => setAberto(evento.currentTarget.open)}
          className="group min-w-0 flex-1"
        >
          <summary className="group/resumo grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light [&::-webkit-details-marker]:hidden">
            <EtiquetaSeveridade severidade={mapearSeveridade(aviso.severidade)} somenteIcone />
            <h3 className="text-card-titulo font-medium text-ink group-hover/resumo:underline">
              {aviso.titulo}
            </h3>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
            />
            {!aberto && primeiraFrase && (
              <span data-primeira-frase="" className="col-start-2 line-clamp-2 text-sm text-muted">
                {primeiraFrase}
              </span>
            )}
          </summary>

          <div className="pl-9">
            <ConteudoArtigo corpo={aviso.corpo} variante="aviso" className="mt-2" />

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
        </details>

        <BotaoCopiar
          compacto
          icone="link"
          valor={() =>
            construirLinkAviso(window.location.origin, window.location.pathname, aviso.id)
          }
          rotulo="Copiar link"
          ariaLabel={`Copiar link do aviso ${aviso.titulo}`}
          className={clsx(
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
