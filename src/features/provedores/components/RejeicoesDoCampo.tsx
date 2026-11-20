import { Link, type LinkProps } from '@tanstack/react-router'
import { useEffect, useId, useMemo } from 'react'

import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import type { ErroDoCampo, ErroResumoPublico } from '../types/versaoProvedorPagina'
import { mensagensQueAcrescentam } from './camposDosErrosConhecidos'

/** Âncora da seção: o modal rola até ela quando o leitor chega pelo contador de rejeições. */
export const ID_SECAO_REJEICOES = 'rejeicoes-do-campo'

export interface RejeicoesDoCampoProps {
  erros: ErroDoCampo[]
  errosResumo: ErroResumoPublico[]
}

function DetalheDaRejeicao({ erro }: { erro: ErroResumoPublico }) {
  const mensagens = mensagensQueAcrescentam(erro)

  return (
    <>
      <p className="text-sm text-ink [overflow-wrap:anywhere]">
        <span className="mr-2 font-mono text-xs font-semibold text-muted">{erro.codigo}</span>
        {erro.titulo}
      </p>
      {mensagens.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 border-l-2 border-accent pl-3">
          {mensagens.map((mensagem) => (
            <li
              key={mensagem}
              className="font-mono text-xs leading-5 text-muted [overflow-wrap:anywhere]"
            >
              {mensagem}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/**
 * Rejeições já registradas para o campo, na ordem recebida. O caminho montado com o `slug` (que vem
 * da API) passa por `caminhoInternoSeguro` antes de virar link; se não passar, o item vira texto.
 *
 * Erro do campo que não está em `errosResumo` nunca some: aparece só com o código, sem link, e o
 * slug vai para o console: a lista do campo e a da versão divergiram e alguém precisa saber.
 */
export function RejeicoesDoCampo({ erros, errosResumo }: RejeicoesDoCampoProps) {
  const tituloId = useId()

  const resumoPorSlug = useMemo(
    () => new Map(errosResumo.map((erro) => [erro.slug, erro])),
    [errosResumo],
  )
  const slugsAusentes = useMemo(
    () => erros.filter((erro) => !resumoPorSlug.has(erro.slug)).map((erro) => erro.slug),
    [erros, resumoPorSlug],
  )

  useEffect(() => {
    for (const slug of slugsAusentes) {
      console.error(`Rejeição "${slug}" do campo não está em errosResumo da versão.`)
    }
  }, [slugsAusentes])

  if (erros.length === 0) return null

  return (
    <section id={ID_SECAO_REJEICOES} aria-labelledby={tituloId} className="scroll-mt-32">
      {/* Alvo do foco do atalho "Ver os N erros" no rodapé do modal. */}
      <h3
        id={tituloId}
        tabIndex={-1}
        data-titulo-das-rejeicoes=""
        className="text-aux font-semibold tracking-wide text-muted uppercase"
      >
        Rejeições registradas ({erros.length})
      </h3>

      <ul className="mt-2 flex flex-col divide-y divide-border border-y border-border">
        {erros.map((erroDoCampo) => {
          const resumo = resumoPorSlug.get(erroDoCampo.slug)

          if (!resumo) {
            return (
              <li key={erroDoCampo.slug} className="px-2 py-2.5">
                <p className="font-mono text-xs font-semibold text-muted">{erroDoCampo.codigo}</p>
              </li>
            )
          }

          const caminho = caminhoInternoSeguro(`/erros/${resumo.slug}`)

          return (
            <li key={resumo.slug}>
              {caminho ? (
                <Link
                  to={caminho as unknown as LinkProps['to']}
                  className="block rounded px-2 py-2.5 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover"
                >
                  <DetalheDaRejeicao erro={resumo} />
                </Link>
              ) : (
                <div className="px-2 py-2.5">
                  <DetalheDaRejeicao erro={resumo} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
