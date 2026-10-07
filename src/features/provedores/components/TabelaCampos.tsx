import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { CaminhoXml } from '../../../components/ui/CaminhoXml'
import { EmptyState } from '../../../components/ui/EmptyState'
import { EtiquetaEstado, type EstadoPreenchimento } from '../../../components/ui/EtiquetaEstado'
import { RotuloDeCaminho } from '../../../components/ui/RotuloDeCaminho'
import { SeloVerificacao } from '../../../components/ui/SeloVerificacao'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../components/ui/Table'
import { campoTemDetalhe, DetalheDoCampo } from './DetalheDoCampo'
import { IndicadorErrosDoCampo } from './IndicadorErrosDoCampo'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import type { EstadoPreenchimentoCampo, GrupoCampoVersao } from '../types/versaoProvedorPagina'

export interface TabelaCamposProps {
  provedorNome: string
  versaoRotulo: string
  verificadoEm: string | null
  totalCampos: number
  camposPorGrupo: GrupoCampoVersao[]
  urlVersaoAbsoluta: string
  /** Slug do campo destacado por âncora (`#campo-{slug}`), se houver — ver `utils/destaqueAncora.ts`. */
  campoDestacado?: string | null
}

/**
 * Colunas do cabeçalho — o `colSpan` da linha de detalhe. Duas delas somem abaixo de 860px, mas
 * `colSpan` maior que o número de colunas visíveis é tratado como "todas", então o valor fixo
 * vale nas duas larguras.
 */
const TOTAL_DE_COLUNAS = 6

const ESTADO_MAP: Record<EstadoPreenchimentoCampo, EstadoPreenchimento> = {
  Obrigatorio: 'obrigatorio',
  Opcional: 'opcional',
  Condicional: 'condicional',
}

/**
 * Tabela exaustiva de campos (§7.6.4) — o núcleo da tela mais densa e mais
 * acessada do portal. A ausência de um campo aqui é informação de negócio:
 * "não se aplica", nunca "não documentado". Por isso a afirmação de
 * exaustividade e o `SeloVerificacao` ficam **adjacentes à tabela, nunca no
 * rodapé**, e o filtro em memória (M8 — não pagina) muda o texto da
 * afirmação sem nunca tocar o selo (M27): o selo atesta a conferência da
 * versão, o filtro é só um recorte de leitura.
 */
export function TabelaCampos({
  provedorNome,
  versaoRotulo,
  verificadoEm,
  totalCampos,
  camposPorGrupo,
  urlVersaoAbsoluta,
  campoDestacado = null,
}: TabelaCamposProps) {
  const filtroId = useId()
  const [termoFiltro, setTermoFiltro] = useState('')

  // Vários campos abertos ao mesmo tempo: comparar duas linhas é o uso natural aqui, e um
  // acordeão que fecha o anterior obrigaria a abrir e reabrir para isso.
  const [camposAbertos, setCamposAbertos] = useState<ReadonlySet<string>>(new Set())

  const alternarCampo = useCallback((campoLayoutSlug: string) => {
    setCamposAbertos((abertos) => {
      const proximos = new Set(abertos)
      if (!proximos.delete(campoLayoutSlug)) proximos.add(campoLayoutSlug)
      return proximos
    })
  }, [])

  const termoNormalizado = termoFiltro.trim().toLowerCase()
  const filtroAtivo = termoNormalizado.length > 0

  const gruposFiltrados = useMemo(() => {
    if (!filtroAtivo) return camposPorGrupo

    return camposPorGrupo
      .map((grupo) => ({
        ...grupo,
        campos: grupo.campos.filter(
          (campo) =>
            campo.nome.toLowerCase().includes(termoNormalizado) ||
            campo.caminhoXml.toLowerCase().includes(termoNormalizado),
        ),
      }))
      .filter((grupo) => grupo.campos.length > 0)
  }, [camposPorGrupo, filtroAtivo, termoNormalizado])

  const totalVisivel = gruposFiltrados.reduce((soma, grupo) => soma + grupo.campos.length, 0)

  // Chegar por `#campo-…` (link de um aviso, ou link copiado) rola até a linha. Se o filtro a
  // esconde, ele é limpo antes: o link prometeu levar ao campo, e uma âncora sem alvo não leva a
  // lugar nenhum. A rolagem acontece uma vez por campo apontado — nunca ao digitar um filtro depois.
  const campoRoladoRef = useRef<string | null>(null)
  const filtroEscondeODestacado =
    campoDestacado !== null &&
    filtroAtivo &&
    !gruposFiltrados.some((grupo) =>
      grupo.campos.some((campo) => campo.campoLayoutSlug === campoDestacado),
    )

  useEffect(() => {
    if (!campoDestacado || campoRoladoRef.current === campoDestacado) return

    if (filtroEscondeODestacado) {
      setTermoFiltro('')
      return
    }

    campoRoladoRef.current = campoDestacado
    document
      .getElementById(construirIdLinhaCampo(campoDestacado))
      ?.scrollIntoView({ block: 'center' })
  }, [campoDestacado, filtroEscondeODestacado])

  // D8/M27 — muda só o TEXTO, nunca a posição, e nunca o SeloVerificacao
  // (renderizado abaixo com props que não dependem do filtro).
  const fraseExaustividade = filtroAtivo
    ? `Mostrando ${totalVisivel} de ${totalCampos} campos — a exaustividade vale para os ${totalCampos} campos desta versão, não para este filtro.`
    : `Esta tabela é exaustiva: o que não está aqui não se aplica a ${provedorNome} ${versaoRotulo}.`

  function limparFiltro() {
    setTermoFiltro('')
  }

  return (
    <section aria-labelledby="tabela-campos-titulo" className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h2 id="tabela-campos-titulo" className="text-subtitulo font-semibold text-ink">
          Campos e mapeamento
        </h2>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink/70">{fraseExaustividade}</p>
          {verificadoEm && <SeloVerificacao data={verificadoEm} />}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={filtroId} className="sr-only">
          Filtrar por nome do campo ou caminho no XML
        </label>
        <input
          id={filtroId}
          type="search"
          value={termoFiltro}
          onChange={(evento) => setTermoFiltro(evento.target.value)}
          placeholder="Filtrar por nome do campo ou caminho no XML"
          className="h-9 min-w-[240px] flex-1 rounded-[var(--radius-input)] border border-border-control px-3 text-sm text-ink placeholder:text-muted focus:border-[1.5px] focus:border-primary-medium focus:outline-none"
        />

        {filtroAtivo && (
          <>
            <span className="rounded-[var(--radius-pill)] border border-border px-2.5 py-0.5 text-xs font-medium text-ink">
              Filtro ativo
            </span>
            <button
              type="button"
              onClick={limparFiltro}
              className="text-sm font-semibold text-primary-medium hover:underline"
            >
              Limpar filtros
            </button>
          </>
        )}
      </div>

      {gruposFiltrados.length === 0 ? (
        <EmptyState
          message="Nenhum campo encontrado para esse filtro."
          action={
            <button
              type="button"
              onClick={limparFiltro}
              className="text-sm font-semibold text-primary-medium hover:underline"
            >
              Limpar filtros
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {gruposFiltrados.map((grupo) => (
            <div
              key={grupo.grupoSlug ?? 'sem-grupo'}
              id={grupo.grupoSlug ? `grupo-${grupo.grupoSlug}` : undefined}
              className="scroll-mt-24"
            >
              {grupo.grupo && (
                /* Filete no acento institucional (o mesmo da borda e do indicador de ativo):
                   ancora a leitura de uma tabela longa e separa os blocos. A paleta de
                   severidade continua reservada aos avisos — colorir também a obrigatoriedade,
                   que é o papel mais repetido da tela, pintaria metade da tabela e tiraria a
                   força justamente do que sinaliza risco (§3.3a). */
                <h3 className="mb-2 flex items-center gap-2 text-card-titulo font-medium text-ink">
                  <span aria-hidden="true" className="h-4 w-1 shrink-0 rounded-full bg-accent" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <RotuloDeCaminho texto={grupo.grupo} />
                  </span>
                </h3>
              )}

              <TableRoot>
                <TableHeader>
                  <TableRow>
                    <TableCell header>Campo (Layout InvoiCy)</TableCell>
                    <TableCell header>Caminho no XML</TableCell>
                    <TableCell header className="hidden min-[860px]:table-cell">
                      Tipo
                    </TableCell>
                    <TableCell header className="hidden min-[860px]:table-cell">
                      Tamanho
                    </TableCell>
                    <TableCell header>Obrigatoriedade</TableCell>
                    <TableCell header>Copiar</TableCell>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {grupo.campos.map((campo) => {
                    const idAncora = construirIdLinhaCampo(campo.campoLayoutSlug)
                    const destacado = campoDestacado === campo.campoLayoutSlug
                    const temDetalhe = campoTemDetalhe(campo)
                    const aberto = camposAbertos.has(campo.campoLayoutSlug)
                    const idDetalhe = `detalhe-${campo.campoLayoutSlug}`

                    return (
                      <Fragment key={campo.campoLayoutSlug}>
                        <TableRow
                          id={idAncora}
                          className={clsx(
                            'scroll-mt-24',
                            destacado && 'border-l-[3px] border-l-accent bg-highlight-anchor',
                          )}
                        >
                          <TableCell className="text-left font-medium">
                            {temDetalhe ? (
                              <button
                                type="button"
                                onClick={() => alternarCampo(campo.campoLayoutSlug)}
                                aria-expanded={aberto}
                                aria-controls={idDetalhe}
                                className="flex items-center gap-1.5 rounded text-left font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
                              >
                                <ChevronRight
                                  aria-hidden="true"
                                  className={clsx(
                                    'size-3.5 shrink-0 text-muted transition-transform',
                                    aberto && 'rotate-90',
                                  )}
                                />
                                {campo.nome}
                              </button>
                            ) : (
                              // Recuo igual ao do chevron, para os nomes ficarem alinhados entre si.
                              <span className="ml-[1.25rem] block">{campo.nome}</span>
                            )}
                            {/*
                              Fora do <button> de propósito: o indicador é um LINK para o erro, e
                              link dentro de botão é aninhamento inválido — o navegador desfaz a
                              árvore e o clique passa a cair no elemento errado.
                            */}
                            <IndicadorErrosDoCampo
                              erros={campo.errosConhecidos}
                              nomeDoCampo={campo.nome}
                            />
                          </TableCell>
                          <TableCell className="text-left text-[11px]">
                            <CaminhoXml caminho={campo.caminhoXml} />
                          </TableCell>
                          <TableCell className="hidden min-[860px]:table-cell">
                            {campo.tipo}
                          </TableCell>
                          <TableCell className="hidden min-[860px]:table-cell">
                            {campo.tamanho ?? '—'}
                          </TableCell>
                          <TableCell>
                            <EtiquetaEstado estado={ESTADO_MAP[campo.estadoPreenchimento]} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {/* Copia o caminho que está NA TELA (`caminhoXml`). Antes copiava
                                `destinoXml`, que é outra informação — para onde o campo vai no XML
                                daquele provedor — e é nula na maioria dos campos: o botão devolvia
                                string vazia, e quem colava não percebia. */}
                              <BotaoCopiar
                                compacto
                                icone="copiar"
                                valor={campo.caminhoXml}
                                rotulo="Copiar caminho"
                                ariaLabel={`Copiar caminho no XML do campo ${campo.nome}`}
                              />
                              <BotaoCopiar
                                compacto
                                icone="link"
                                valor={() => `${urlVersaoAbsoluta}#${idAncora}`}
                                rotulo="Copiar link"
                                ariaLabel={`Copiar link do campo ${campo.nome}`}
                              />
                            </div>
                          </TableCell>
                        </TableRow>

                        {temDetalhe && aberto && (
                          <tr className="border-b border-line bg-surface-hover">
                            <td colSpan={TOTAL_DE_COLUNAS}>
                              <DetalheDoCampo campo={campo} id={idDetalhe} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </TableRoot>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
