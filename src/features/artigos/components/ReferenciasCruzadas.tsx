import clsx from 'clsx'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ReferenciaCampoLayout, ReferenciaErro } from '../types/artigo'

export interface ReferenciasCruzadasProps {
  camposLayout: ReferenciaCampoLayout[]
  erros: ReferenciaErro[]
}

/**
 * Grupo do campo no Layout InvoiCy (`Servico/Valores` em `//Servico/Valores/ValAliqISS`), ou
 * `null` quando o campo fica na raiz do RPS — aí o caminho só repetiria o nome.
 */
export function grupoDoCampo(caminhoXml: string): string | null {
  const relativo = caminhoXml.replace(/^\/\//, '')
  const fimDoGrupo = relativo.lastIndexOf('/')
  return fimDoGrupo > 0 ? relativo.slice(0, fimDoGrupo) : null
}

/**
 * Campos do artigo como tags compactas. A tag abre, abaixo da lista, o que o campo é e o link para
 * a página dele no Layout InvoiCy — um aberto por vez. O caminho só aparece quando o campo está
 * dentro de um grupo.
 */
function CamposRelacionadosDoArtigo({ campos }: { campos: ReferenciaCampoLayout[] }) {
  const idPainel = useId()
  const [slugAberto, setSlugAberto] = useState<string | null>(null)
  const tags = useRef(new Map<string, HTMLButtonElement>())
  const aberto = campos.find((campo) => campo.slug === slugAberto) ?? null
  const grupoAberto = aberto ? grupoDoCampo(aberto.caminhoXml) : null

  function fecharComEscape(evento: KeyboardEvent) {
    if (evento.key !== 'Escape' || !slugAberto) return
    tags.current.get(slugAberto)?.focus()
    setSlugAberto(null)
  }

  return (
    <section
      aria-labelledby="campos-layout-relacionados-titulo"
      className="flex flex-col gap-3"
      onKeyDown={fecharComEscape}
    >
      <h2 id="campos-layout-relacionados-titulo" className="text-subtitulo font-semibold text-ink">
        Campos do Layout InvoiCy
      </h2>

      <ul className="flex flex-wrap gap-2">
        {campos.map((campo) => {
          const estaAberto = campo.slug === slugAberto
          const grupo = grupoDoCampo(campo.caminhoXml)

          return (
            <li key={campo.slug} className="min-w-0">
              <button
                type="button"
                ref={(elemento) => {
                  if (elemento) tags.current.set(campo.slug, elemento)
                  else tags.current.delete(campo.slug)
                }}
                aria-expanded={estaAberto}
                aria-controls={idPainel}
                onClick={() => setSlugAberto(estaAberto ? null : campo.slug)}
                className={clsx(
                  'inline-flex max-w-full items-center gap-1 rounded-[var(--radius-control)] border px-2.5 py-1 font-mono text-xs text-ink hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light',
                  estaAberto ? 'border-primary-light bg-alert-info' : 'border-border bg-white',
                )}
              >
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {grupo && <span className="text-muted">{grupo}/</span>}
                  {campo.nome}
                </span>
                <ChevronDown
                  className={clsx(
                    'size-3.5 shrink-0 transition-transform',
                    estaAberto && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
            </li>
          )
        })}
      </ul>

      {/* O painel existe sempre, para o `aria-controls` das tags apontar para um elemento real. */}
      <div id={idPainel}>
        {aberto && (
          <div className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-line border-l-2 border-l-accent bg-white p-4">
            <p className="font-mono text-sm font-semibold text-ink">{aberto.nome}</p>
            {grupoAberto && (
              <p className="text-xs text-muted">
                Dentro do grupo <span className="font-mono">{grupoAberto}</span>
              </p>
            )}
            <p className="max-w-[70ch] text-sm text-ink">{aberto.significado}</p>
            <Link
              to="/layout/campos/$campoSlug"
              params={{ campoSlug: aberto.slug }}
              className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary-medium hover:underline"
            >
              Ver no Layout InvoiCy
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Referências cruzadas da página do artigo: campos do Layout InvoiCy e rejeições relacionadas. O
 * título de cada seção já diz a natureza das referências, então os itens não repetem rótulo.
 */
export function ReferenciasCruzadas({ camposLayout, erros }: ReferenciasCruzadasProps) {
  if (camposLayout.length === 0 && erros.length === 0) return null

  return (
    <div className="flex flex-col gap-8">
      {camposLayout.length > 0 && <CamposRelacionadosDoArtigo campos={camposLayout} />}

      {erros.length > 0 && (
        <section aria-labelledby="erros-relacionados-titulo" className="flex flex-col gap-3">
          <h2 id="erros-relacionados-titulo" className="text-subtitulo font-semibold text-ink">
            Rejeições relacionadas
          </h2>

          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {erros.map((erro) => (
              <li key={erro.slug} className="py-2.5">
                {/* Rota tipada a partir do `slug` do contrato — não remonta a
                    string de `url`, que aqui serve só de dado de exibição. */}
                <Link
                  to="/erros/$erroSlug"
                  params={{ erroSlug: erro.slug }}
                  className="text-sm text-primary-medium hover:underline"
                >
                  <span className="font-mono font-semibold">{erro.codigo}</span> — {erro.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
