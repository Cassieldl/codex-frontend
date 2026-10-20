import { Link, type LinkProps } from '@tanstack/react-router'
import { useId, useMemo, useState } from 'react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import type { ErroResumoPublico, GrupoCampoVersao } from '../types/versaoProvedorPagina'
import {
  indexarCamposPorErro,
  mensagensQueAcrescentam,
  normalizar,
} from './camposDosErrosConhecidos'

/** Quantos erros aparecem de cada vez — a versão do Emissor Nacional tem mais de 450, e a busca acha o resto. */
export const ERROS_POR_VEZ = 10

export interface ErrosConhecidosProps {
  resumo: { total: number; itens: ErroResumoPublico[] }
  /** Os campos da versão: é deles que sai o campo de cada erro, pelo vínculo campo → erro. */
  camposPorGrupo: GrupoCampoVersao[]
}

/**
 * "Erros conhecidos" da versão. Uma linha por erro (código e título), com o campo relacionado e a
 * mensagem observada só quando ela diz algo além do título. A busca filtra por código, texto ou
 * campo; a lista mostra {@link ERROS_POR_VEZ} de cada vez.
 *
 * O caminho montado com `erro.slug` (que vem da API) passa por `caminhoInternoSeguro` antes de virar
 * sink de navegação; se não passar, o item renderiza só o texto, sem link.
 */
export function ErrosConhecidos({ resumo, camposPorGrupo }: ErrosConhecidosProps) {
  const buscaId = useId()
  const [termo, setTermo] = useState('')
  const [quantidade, setQuantidade] = useState(ERROS_POR_VEZ)

  const camposPorErro = useMemo(() => indexarCamposPorErro(camposPorGrupo), [camposPorGrupo])

  const termoNormalizado = normalizar(termo.trim())
  const filtrados = useMemo(
    () =>
      resumo.itens.filter((erro) => {
        const campos = camposPorErro.get(erro.slug) ?? []
        if (!termoNormalizado) return true
        return [
          erro.codigo,
          erro.titulo,
          ...erro.variantes,
          ...campos.map((campo) => campo.nome),
        ].some((texto) => normalizar(texto).includes(termoNormalizado))
      }),
    [resumo.itens, camposPorErro, termoNormalizado],
  )

  if (resumo.itens.length === 0) return null

  const visiveis = filtrados.slice(0, quantidade)
  const restantes = filtrados.length - visiveis.length

  function buscar(valor: string) {
    setTermo(valor)
    setQuantidade(ERROS_POR_VEZ)
  }

  return (
    <section
      id="erros-conhecidos"
      aria-labelledby="erros-conhecidos-titulo"
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <h2 id="erros-conhecidos-titulo" className="text-subtitulo font-semibold text-ink">
        Erros conhecidos <span className="text-base font-normal text-muted">({resumo.total})</span>
      </h2>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={buscaId} className="sr-only">
          Buscar erro por código, mensagem ou campo
        </label>
        <input
          id={buscaId}
          type="search"
          value={termo}
          onChange={(evento) => buscar(evento.target.value)}
          placeholder="Buscar por código, mensagem ou campo"
          className="h-9 min-w-[240px] flex-1 rounded-[var(--radius-input)] border border-border-control px-3 text-sm text-ink placeholder:text-muted focus:border-[1.5px] focus:border-primary-medium focus:outline-none"
        />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          message="Nenhum erro encontrado para esse filtro."
          action={
            <button
              type="button"
              onClick={() => buscar('')}
              className="text-sm font-semibold text-primary-medium hover:underline"
            >
              Limpar filtros
            </button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {visiveis.map((erro) => {
            const caminho = caminhoInternoSeguro(`/erros/${erro.slug}`)
            const campos = camposPorErro.get(erro.slug) ?? []
            const mensagens = mensagensQueAcrescentam(erro)
            const conteudo = (
              <>
                <p className="text-sm text-ink [overflow-wrap:anywhere]">
                  <span className="mr-2 font-mono text-xs font-semibold text-muted">
                    {erro.codigo}
                  </span>
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
                {campos.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    {campos.length === 1 ? 'Campo' : 'Campos'}:{' '}
                    <span className="font-mono text-ink/80">
                      {campos.map((campo) => campo.nome).join(', ')}
                    </span>
                  </p>
                )}
              </>
            )

            return (
              <li key={erro.slug}>
                {caminho ? (
                  <Link
                    to={caminho as unknown as LinkProps['to']}
                    className="block px-2 py-2.5 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <div className="px-2 py-2.5">{conteudo}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {filtrados.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted">
            Mostrando {visiveis.length} de {filtrados.length}
          </span>
          {restantes > 0 && (
            <button
              type="button"
              onClick={() => setQuantidade((atual) => atual + ERROS_POR_VEZ)}
              className="font-semibold text-primary-medium hover:underline"
            >
              Mostrar mais {Math.min(ERROS_POR_VEZ, restantes)}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
