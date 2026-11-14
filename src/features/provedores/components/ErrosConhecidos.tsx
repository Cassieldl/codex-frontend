import { Link, type LinkProps } from '@tanstack/react-router'
import { useId, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Pagination } from '../../../components/ui/Pagination'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import { resolverMensagemDoErro } from '../../erros/utils/mensagemDoErro'
import type { ErroResumoPublico, GrupoCampoVersao } from '../types/versaoProvedorPagina'
import { ordenarErrosPorCodigo } from '../utils/ordenarErrosPorCodigo'
import { ID_SECAO_ERROS_CONHECIDOS } from '../utils/secoesDoProvedor'
import { indexarCamposPorErro, normalizar } from './camposDosErrosConhecidos'

/** Erros por página: o padrão de paginação do projeto. */
export const ERROS_POR_PAGINA = 25

export interface ErrosConhecidosProps {
  resumo: { total: number; itens: ErroResumoPublico[] }
  /** Os campos da versão: é deles que sai o campo de cada erro, pelo vínculo campo → erro. */
  camposPorGrupo: GrupoCampoVersao[]
}

interface CampoDoErro {
  nome: string
}

function ConteudoDoErro({ erro, campos }: { erro: ErroResumoPublico; campos: CampoDoErro[] }) {
  // Título cortado em "…" vira a mensagem inteira, e ela não se repete embaixo.
  const { principal, outras: mensagens } = resolverMensagemDoErro(erro)

  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3">
      <span className="font-mono text-sm font-semibold text-ink">{erro.codigo}</span>
      <div className="min-w-0">
        <p className="text-sm text-ink [overflow-wrap:anywhere]">{principal}</p>
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
            <span className="font-mono text-ink">
              {campos.map((campo) => campo.nome).join(', ')}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * "Erros conhecidos" da versão, em ordem crescente de código. O código tem coluna própria, porque
 * quem chega aqui costuma ter um código na mão. A mensagem observada aparece só quando diz algo
 * além do título. A busca filtra por código, texto ou campo, e volta para a página 1.
 *
 * A lista inteira já vem na página da versão, então a paginação é local. O caminho montado com
 * `erro.slug` passa por `caminhoInternoSeguro` antes de virar sink de navegação; se não passar,
 * o item renderiza só o texto, sem link.
 */
export function ErrosConhecidos({ resumo, camposPorGrupo }: ErrosConhecidosProps) {
  const buscaId = useId()
  const secaoRef = useRef<HTMLElement | null>(null)
  const [termo, setTermo] = useState('')
  const [pagina, setPagina] = useState(1)
  const [errosPorPagina, setErrosPorPagina] = useState(ERROS_POR_PAGINA)

  const camposPorErro = useMemo(() => indexarCamposPorErro(camposPorGrupo), [camposPorGrupo])
  const ordenados = useMemo(() => ordenarErrosPorCodigo(resumo.itens), [resumo.itens])

  const termoNormalizado = normalizar(termo.trim())
  const filtrados = useMemo(
    () =>
      ordenados.filter((erro) => {
        if (!termoNormalizado) return true
        const campos = camposPorErro.get(erro.slug) ?? []
        return [
          erro.codigo,
          erro.titulo,
          ...erro.variantes,
          ...campos.map((campo) => campo.nome),
        ].some((texto) => normalizar(texto).includes(termoNormalizado))
      }),
    [ordenados, camposPorErro, termoNormalizado],
  )

  if (resumo.itens.length === 0) return null

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / errosPorPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * errosPorPagina
  const visiveis = filtrados.slice(inicio, inicio + errosPorPagina)

  function buscar(valor: string) {
    setTermo(valor)
    setPagina(1)
  }

  function irParaPagina(novaPagina: number) {
    setPagina(novaPagina)
    // O jsdom não implementa `scrollIntoView`; o navegador sempre tem.
    secaoRef.current?.scrollIntoView?.({ block: 'start' })
  }

  function mudarErrosPorPagina(quantidade: number) {
    setErrosPorPagina(quantidade)
    setPagina(1)
  }

  return (
    <section
      ref={secaoRef}
      id={ID_SECAO_ERROS_CONHECIDOS}
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
            const conteudo = (
              <ConteudoDoErro erro={erro} campos={camposPorErro.get(erro.slug) ?? []} />
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
        <Pagination
          ariaLabel="Páginas de erros conhecidos"
          page={paginaAtual}
          pageSize={errosPorPagina}
          totalCount={filtrados.length}
          totalPages={totalPaginas}
          onPageChange={irParaPagina}
          onPageSizeChange={mudarErrosPorPagina}
        />
      )}
    </section>
  )
}
