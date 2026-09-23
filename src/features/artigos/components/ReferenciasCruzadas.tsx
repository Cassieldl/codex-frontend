import { Link } from '@tanstack/react-router'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import type { ReferenciaCampoLayout, ReferenciaErro } from '../types/artigo'

export interface ReferenciasCruzadasProps {
  camposLayout: ReferenciaCampoLayout[]
  erros: ReferenciaErro[]
}

/** Selo com o rótulo literal do DTO — nomeia a natureza da referência item a item (§7.5 do escopo). */
function SeloReferencia({ rotulo }: { rotulo: string }) {
  return <span className="text-aux font-semibold tracking-wide text-muted uppercase">{rotulo}</span>
}

/**
 * Referências cruzadas da página do artigo (§3.3): campos do Layout InvoiCy e
 * rejeições relacionadas, cada seção com `<h2>` próprio e cada item com o
 * `rotulo` do contrato.
 *
 * Campo de layout tem `url: null` em toda esta fatia (PQ-06) — renderiza como
 * texto, nunca como link morto. Quando a 003 popular `url`, só o dado muda: o
 * branch condicional já está aqui, mesmo padrão de `CamposRelacionados`.
 */
export function ReferenciasCruzadas({ camposLayout, erros }: ReferenciasCruzadasProps) {
  if (camposLayout.length === 0 && erros.length === 0) return null

  return (
    <div className="flex flex-col gap-6">
      {camposLayout.length > 0 && (
        <section
          aria-labelledby="campos-layout-relacionados-titulo"
          className="flex flex-col gap-3"
        >
          <h2
            id="campos-layout-relacionados-titulo"
            className="text-subtitulo font-semibold text-ink"
          >
            Campos do Layout InvoiCy
          </h2>

          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {camposLayout.map((campo) => {
              // O saneamento entra junto com o branch, não junto com o dado: `url` é sempre nulo
              // nesta fatia, então o `<a>` é código agendado para a 003 — e endereço externo ou
              // `javascript:` vindo da API cairia direto num link de página pública e anônima.
              const caminho = caminhoInternoSeguro(campo.url)

              return (
                <li key={campo.slug} className="flex flex-col gap-1 py-3">
                  <SeloReferencia rotulo={campo.rotulo} />
                  {caminho ? (
                    <a
                      href={caminho}
                      className="text-sm font-medium text-primary-medium hover:underline"
                    >
                      {campo.nome}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-ink">{campo.nome}</span>
                  )}
                  <code className="font-mono text-xs text-muted">{campo.caminhoXml}</code>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {erros.length > 0 && (
        <section aria-labelledby="erros-relacionados-titulo" className="flex flex-col gap-3">
          <h2 id="erros-relacionados-titulo" className="text-subtitulo font-semibold text-ink">
            Rejeições relacionadas
          </h2>

          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {erros.map((erro) => (
              <li key={erro.slug} className="flex flex-col gap-1 py-3">
                <SeloReferencia rotulo={erro.rotulo} />
                {/* Rota tipada a partir do `slug` do contrato — não remonta a
                    string de `url`, que aqui serve só de dado de exibição. */}
                <Link
                  to="/erros/$erroSlug"
                  params={{ erroSlug: erro.slug }}
                  className="text-sm font-medium text-primary-medium hover:underline"
                >
                  <span className="font-mono">{erro.codigo}</span> — {erro.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
