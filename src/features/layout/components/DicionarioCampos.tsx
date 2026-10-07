import clsx from 'clsx'
import { useId, useMemo, useState } from 'react'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { CaminhoXml } from '../../../components/ui/CaminhoXml'
import { EmptyState } from '../../../components/ui/EmptyState'
import { RotuloDeCaminho } from '../../../components/ui/RotuloDeCaminho'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../components/ui/Table'
import { construirIdLinhaCampo } from '../../provedores/utils/destaqueAncora'
import type { GrupoCamposLayout } from '../types/layoutPublico'

export interface DicionarioCamposProps {
  versaoRotulo: string
  totalCampos: number
  camposPorGrupo: GrupoCamposLayout[]
  /**
   * Origem absoluta da aplicação (`https://…`) — o link copiável do verbete é
   * ela + `campo.urlCanonica`. O **caminho** nunca é montado aqui: a fonte
   * única é `urlCanonica` (A3), e os dois podem divergir no futuro.
   */
  origemUrl: string
  /** Slug do campo destacado por âncora (`#campo-{slug}`). */
  campoDestacado?: string | null
}

/**
 * Dicionário denso da tela 6. A regra que governa a tela: **o layout é
 * vocabulário, não comportamento** — por isso são só três colunas de conteúdo
 * (nome, caminho, significado) e nenhuma coluna técnica (R3). Tipo, tamanho,
 * máscara e obrigatoriedade são do provedor, e a página afirma isso em texto
 * fixo, nunca por omissão.
 *
 * O filtro é em memória sobre o dicionário inteiro (nunca servidor, mesma
 * disciplina de `TabelaCampos`) e muda só o TEXTO da contagem, nunca a
 * posição dele.
 */
export function DicionarioCampos({
  versaoRotulo,
  totalCampos,
  camposPorGrupo,
  origemUrl,
  campoDestacado = null,
}: DicionarioCamposProps) {
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
            campo.caminhoXml.toLowerCase().includes(termoNormalizado) ||
            campo.significado.toLowerCase().includes(termoNormalizado),
        ),
      }))
      .filter((grupo) => grupo.campos.length > 0)
  }, [camposPorGrupo, filtroAtivo, termoNormalizado])

  const totalVisivel = gruposFiltrados.reduce((soma, grupo) => soma + grupo.campos.length, 0)

  const fraseContagem = filtroAtivo
    ? `Mostrando ${totalVisivel} de ${totalCampos} campos.`
    : `${totalCampos} campos no vocabulário da ${versaoRotulo}.`

  const dicionarioVazio = camposPorGrupo.length === 0

  function limparFiltro() {
    setTermoFiltro('')
  }

  return (
    <section aria-labelledby="dicionario-campos-titulo" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id="dicionario-campos-titulo" className="text-subtitulo font-semibold text-ink">
          Dicionário de campos
        </h2>
        <p className="text-sm text-ink/70">Filtre por nome, por caminho ou por significado.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={filtroId} className="sr-only">
          Filtrar por nome, caminho ou significado do campo
        </label>
        <input
          id={filtroId}
          type="search"
          value={termoFiltro}
          onChange={(evento) => setTermoFiltro(evento.target.value)}
          placeholder="Filtrar por nome, caminho ou significado"
          className="h-9 min-w-[240px] flex-1 rounded-[var(--radius-input)] border border-border-control px-3 text-sm text-ink placeholder:text-muted focus:border-[1.5px] focus:border-primary-medium focus:outline-none"
        />

        {filtroAtivo && (
          <button
            type="button"
            onClick={limparFiltro}
            className="text-sm font-semibold text-primary-medium hover:underline"
          >
            Limpar filtro
          </button>
        )}
      </div>

      <p className="text-sm text-ink/70">{fraseContagem}</p>

      {dicionarioVazio && (
        <EmptyState message={`A ${versaoRotulo} ainda não tem campos publicados.`} />
      )}

      {!dicionarioVazio && gruposFiltrados.length === 0 && (
        <EmptyState
          message={`Nenhum campo da ${versaoRotulo} corresponde a “${termoFiltro.trim()}”.`}
          action={
            <div className="flex flex-col items-center gap-3">
              <p className="max-w-prose text-sm text-ink/70">
                O nome pode ser o do provedor, não o do layout. A tabela do provedor mostra os dois
                lados lado a lado.
              </p>
              <button
                type="button"
                onClick={limparFiltro}
                className="text-sm font-semibold text-primary-medium hover:underline"
              >
                Limpar filtro
              </button>
            </div>
          }
        />
      )}

      {gruposFiltrados.length > 0 && (
        <div className="flex flex-col gap-8">
          {gruposFiltrados.map((grupo) => (
            <div
              key={grupo.grupoSlug ?? 'sem-grupo'}
              id={grupo.grupoSlug ? `grupo-${grupo.grupoSlug}` : undefined}
              className="scroll-mt-24"
            >
              {grupo.grupo && (
                /* Mesmo filete de acento da tabela de campos do provedor — as duas telas mostram
                   grupos do mesmo vocabulário e não podem marcá-los de formas diferentes. */
                <h3 className="sticky top-0 z-10 mb-2 flex items-center gap-2 bg-white py-1 text-card-titulo font-medium text-ink">
                  <span aria-hidden="true" className="h-4 w-1 shrink-0 rounded-full bg-accent" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <RotuloDeCaminho texto={grupo.grupo} />
                  </span>
                </h3>
              )}

              <TableRoot>
                <TableHeader>
                  <TableRow>
                    <TableCell header className="text-left">
                      Campo
                    </TableCell>
                    <TableCell header className="text-left">
                      Caminho no Layout InvoiCy
                    </TableCell>
                    <TableCell header className="hidden text-left min-[900px]:table-cell">
                      Significado
                    </TableCell>
                    <TableCell header>Copiar</TableCell>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {grupo.campos.map((campo) => {
                    const idAncora = construirIdLinhaCampo(campo.slug)
                    const destacado = campoDestacado === campo.slug

                    return (
                      <TableRow
                        key={campo.slug}
                        id={idAncora}
                        className={clsx(
                          'h-auto scroll-mt-24 align-top',
                          campo.descontinuadoNestaVersao && 'opacity-70',
                          destacado && 'border-l-[3px] border-l-accent bg-highlight-anchor',
                        )}
                      >
                        <TableCell className="py-3 text-left">
                          <span className="font-medium text-ink">{campo.nome}</span>
                          {campo.novoNestaVersao && (
                            <span className="mt-1 ml-2 inline-flex items-center rounded-[var(--radius-pill)] border border-dashed border-primary px-2 py-px text-aux font-semibold tracking-wide text-primary uppercase">
                              novo na {versaoRotulo}
                            </span>
                          )}
                          {campo.descontinuadoNestaVersao && (
                            // Nunca só opacidade: o texto está sempre presente.
                            <span className="mt-1 block text-aux font-semibold text-ink/70">
                              Descontinuado nesta versão
                            </span>
                          )}
                          {/* Abaixo de 900px a coluna de significado sai da
                              tabela — o texto continua na linha, nunca some. */}
                          <span className="mt-1 block text-xs text-ink/70 [overflow-wrap:anywhere] min-[900px]:hidden">
                            {campo.significado}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-left text-[11px]">
                          <CaminhoXml caminho={campo.caminhoXml} />
                        </TableCell>
                        <TableCell className="hidden py-3 text-left text-xs leading-relaxed [overflow-wrap:anywhere] min-[900px]:table-cell">
                          {campo.significado}
                        </TableCell>
                        <TableCell className="py-3">
                          <BotaoCopiar
                            valor={`${origemUrl}${campo.urlCanonica}`}
                            rotulo="Link"
                            ariaLabel={`Copiar link do verbete ${campo.nome}`}
                          />
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
