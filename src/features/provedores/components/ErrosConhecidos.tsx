import { ChevronRight, Search } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Pagination } from '../../../components/ui/Pagination'
import { cn } from '../../../lib/cn'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import { resolverMensagemDoErro } from '../../erros/utils/mensagemDoErro'
import type { ErroResumoPublico, GrupoCampoVersao } from '../types/versaoProvedorPagina'
import { ordenarErrosPorCodigo } from '../utils/ordenarErrosPorCodigo'
import { ID_SECAO_ERROS_CONHECIDOS } from '../utils/secoesDoProvedor'
import { indexarCamposPorErro, normalizar, type CampoDoErro } from './camposDosErrosConhecidos'
import { DetalheDoErroNaLista } from './DetalheDoErroNaLista'

/** Erros por página: o padrão de paginação do projeto. */
export const ERROS_POR_PAGINA = 25

export interface ErrosConhecidosProps {
  resumo: { total: number; itens: ErroResumoPublico[] }
  provedorSlug: string
  /** Os campos da versão: é deles que sai o campo de cada erro, pelo vínculo campo → erro. */
  camposPorGrupo: GrupoCampoVersao[]
}

function ConteudoDoErro({ erro, campos }: { erro: ErroResumoPublico; campos: CampoDoErro[] }) {
  // Título cortado em "…" vira a mensagem inteira, e ela não se repete embaixo.
  const { principal, outras: mensagens } = resolverMensagemDoErro(erro)

  return (
    <div className="grid min-w-0 flex-1 grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3">
      <span className="font-mono text-sm font-bold text-primary-medium">{erro.codigo}</span>
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
          <p className="mt-1.5 text-xs text-muted">
            {campos.length === 1 ? 'Campo' : 'Campos'}:{' '}
            <span className="rounded bg-surface-hover px-1.5 py-0.5 font-mono font-semibold text-ink">
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
 * A lista inteira já vem na página da versão, então a paginação é local. Cada linha abre ali mesmo
 * com a correção (buscada só ao abrir). O caminho montado com `erro.slug` passa por
 * `caminhoInternoSeguro`; se não passar, o detalhe aparece sem o link para a página do erro.
 */
export function ErrosConhecidos({ resumo, provedorSlug, camposPorGrupo }: ErrosConhecidosProps) {
  const buscaId = useId()
  const painelId = useId()
  const [erroAberto, setErroAberto] = useState<string | null>(null)
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
      {/* A aba já diz "Erros conhecidos": o título fica para o leitor de tela. */}
      <h2 id="erros-conhecidos-titulo" className="sr-only">
        Erros conhecidos ({resumo.total})
      </h2>

      <div className="relative">
        <label htmlFor={buscaId} className="sr-only">
          Buscar erro por código, mensagem ou campo
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-primary-medium"
          aria-hidden="true"
        />
        <input
          id={buscaId}
          type="search"
          value={termo}
          onChange={(evento) => buscar(evento.target.value)}
          placeholder={`Buscar nos ${resumo.total} erros: código, trecho da mensagem ou campo`}
          className="h-12 w-full rounded-xl border border-border-control bg-white pr-4 pl-11 text-sm text-ink placeholder:text-muted focus:border-primary-medium focus:outline-none"
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
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-card">
          <ul className="flex flex-col divide-y divide-border">
            {visiveis.map((erro) => {
              const aberto = erroAberto === erro.slug
              const idDoPainel = `${painelId}-${erro.slug}`
              const campos = camposPorErro.get(erro.slug) ?? []

              return (
                <li key={erro.slug} className={cn(aberto && 'bg-surface-hover')}>
                  <button
                    type="button"
                    aria-expanded={aberto}
                    aria-controls={idDoPainel}
                    onClick={() => setErroAberto(aberto ? null : erro.slug)}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-surface-hover"
                  >
                    <ConteudoDoErro erro={erro} campos={campos} />
                    <ChevronRight
                      className={cn(
                        'mt-0.5 size-4.5 shrink-0 text-primary-light transition-transform duration-150',
                        aberto && 'rotate-90',
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {aberto && (
                    <div id={idDoPainel} className="px-5 pb-5 sm:pl-[calc(5.5rem+2rem)]">
                      <DetalheDoErroNaLista
                        erroSlug={erro.slug}
                        codigo={erro.codigo}
                        caminhoDoErro={caminhoInternoSeguro(`/erros/${erro.slug}`) ?? null}
                        provedorSlug={provedorSlug}
                        campos={campos}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
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
