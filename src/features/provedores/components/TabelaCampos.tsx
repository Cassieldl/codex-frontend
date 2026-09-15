import clsx from 'clsx'
import { useId, useMemo, useState } from 'react'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { EmptyState } from '../../../components/ui/EmptyState'
import { EtiquetaEstado, type EstadoPreenchimento } from '../../../components/ui/EtiquetaEstado'
import { SeloVerificacao } from '../../../components/ui/SeloVerificacao'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../components/ui/Table'
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
          {verificadoEm && <SeloVerificacao data={new Date(verificadoEm)} />}
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
          className="h-9 min-w-[240px] flex-1 rounded-[var(--radius-input)] border border-border px-3 text-sm text-ink placeholder:text-ink/40 focus:border-[1.5px] focus:border-primary-medium focus:outline-none"
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
                <h3 className="mb-2 text-card-titulo font-medium text-ink">{grupo.grupo}</h3>
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

                    return (
                      <TableRow
                        key={campo.campoLayoutSlug}
                        id={idAncora}
                        className={clsx(
                          'scroll-mt-24',
                          destacado && 'border-l-[3px] border-l-accent bg-highlight-anchor',
                        )}
                      >
                        <TableCell className="text-left font-medium">{campo.nome}</TableCell>
                        <TableCell className="text-left font-mono text-[11px]">
                          {campo.caminhoXml}
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
                            <BotaoCopiar
                              valor={campo.destinoXml ?? ''}
                              rotulo="Caminho"
                              ariaLabel={`Copiar caminho no XML do campo ${campo.nome}`}
                            />
                            <BotaoCopiar
                              valor={() => `${urlVersaoAbsoluta}#${idAncora}`}
                              rotulo="Link"
                              ariaLabel={`Copiar link do campo ${campo.nome}`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
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
