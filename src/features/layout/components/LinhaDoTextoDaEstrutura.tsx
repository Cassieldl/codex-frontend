import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { memo } from 'react'
import { construirIdLinhaCampo } from '../../provedores/utils/destaqueAncora'
import type { FormatoDaEstrutura, PresencaDoNo } from '../types/estruturaLayout'
import type { LinhaDaEstrutura } from '../utils/linhasDaEstrutura'
import { SeloReformaTributaria } from '../../../components/ui/SeloReformaTributaria'

export interface LinhaDoTextoDaEstruturaProps {
  indice: number
  linha: LinhaDaEstrutura
  formato: FormatoDaEstrutura
  /** Grupo recolhido: a linha mostra o fechamento logo depois de "…". */
  recolhido: boolean
  textoDoFechamento: string | null
  /** `id` da âncora `estrutura-{slug}`; só a primeira linha de cada tag tem. */
  idDaAncora: string | null
  destacada: boolean
  /**
   * O que a tag do campo faz: `verbete` vira botão que abre o modal; `linhaDaTabela` vira link
   * para `#campo-{slug}` na mesma página; `null` fica texto.
   */
  acaoDaTag: AcaoDaTag | null
  /** Só a página do layout sabe: o destino na tabela do provedor não traz a marca. */
  daReformaTributaria?: boolean
  /** Precisa ser estável: sem isso o `memo` não evita nenhum render. */
  onAlternarGrupo: (indice: number) => void
  onAbrirTag: (campoSlug: string, indice: number) => void
}

export type AcaoDaTag = 'verbete' | 'linhaDaTabela'

const INDENTACAO = '  '

const CLASSE_DA_TAG =
  'font-semibold text-primary-medium underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-light'

const MARCADOR_DE_PRESENCA: Record<
  Exclude<PresencaDoNo, 'ambos'>,
  { rotulo: string; explicacao: string }
> = {
  soXml: { rotulo: 'só SOAP', explicacao: ': esta tag existe só no envio XML (SOAP)' },
  soJson: { rotulo: 'só REST', explicacao: ': esta tag existe só no envio JSON (REST)' },
}

const MARCADOR_DE_ESCOLHA = {
  rotulo: 'uma entre as opções',
  explicacao: ': informe só uma das tags irmãs com esta marca',
}

export const CLASSE_DO_MARCADOR =
  'ml-3 inline-flex shrink-0 items-center self-center rounded-[var(--radius-pill)] border border-border-control px-2 font-sans text-aux font-semibold tracking-wide text-ink uppercase'

/** Uma linha do texto da estrutura: número, controle do grupo, texto e marcadores. */
export const LinhaDoTextoDaEstrutura = memo(function LinhaDoTextoDaEstrutura({
  indice,
  linha,
  formato,
  recolhido,
  textoDoFechamento,
  idDaAncora,
  destacada,
  acaoDaTag,
  daReformaTributaria = false,
  onAlternarGrupo,
  onAbrirTag,
}: LinhaDoTextoDaEstruturaProps) {
  const { no } = linha
  const campoSlug = no?.campoSlug ?? null
  const ehGrupo = linha.fimDoGrupo !== null
  const marcador = no && no.formato !== 'ambos' ? MARCADOR_DE_PRESENCA[no.formato] : null
  // No XML a tag que repete aparece uma vez; no JSON o array já diz isso.
  const repeteNoXml = formato === 'xml' && no?.repete === true

  return (
    <div
      id={idDaAncora ?? undefined}
      data-linha={indice}
      className={clsx(
        'flex min-w-max items-start border-l-[3px] pr-4',
        destacada ? 'border-l-accent bg-highlight-anchor' : 'border-l-transparent',
      )}
    >
      <span
        aria-hidden="true"
        className="w-12 shrink-0 pr-3 text-right text-muted tabular-nums select-none"
      >
        {indice + 1}
      </span>

      <span className="flex w-6 shrink-0 justify-center">
        {ehGrupo && no && (
          <button
            type="button"
            aria-expanded={!recolhido}
            aria-label={`${recolhido ? 'Expandir' : 'Recolher'} ${no.nome}`}
            onClick={() => onAlternarGrupo(indice)}
            className="mt-1 inline-flex size-4 items-center justify-center rounded-sm text-muted hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-light"
          >
            <ChevronRight
              aria-hidden="true"
              className={clsx('size-3.5 transition-transform', !recolhido && 'rotate-90')}
            />
          </button>
        )}
      </span>

      <span className="whitespace-pre text-ink">
        {INDENTACAO.repeat(linha.profundidade)}
        {linha.prefixo}
        {no &&
          (campoSlug === null || acaoDaTag === null ? (
            no.nome
          ) : acaoDaTag === 'verbete' ? (
            <button
              type="button"
              data-botao-da-tag=""
              aria-haspopup="dialog"
              onClick={() => onAbrirTag(campoSlug, indice)}
              className={CLASSE_DA_TAG}
            >
              {no.nome}
            </button>
          ) : (
            <a
              href={`#${construirIdLinhaCampo(campoSlug)}`}
              aria-label={`${no.nome}, ver o campo na tabela`}
              className={CLASSE_DA_TAG}
            >
              {no.nome}
            </a>
          ))}
        {linha.sufixo}
        {recolhido && textoDoFechamento !== null && (
          <>
            <span className="text-muted">…</span>
            {textoDoFechamento}
          </>
        )}
      </span>

      {daReformaTributaria && <SeloReformaTributaria className="ml-3 self-center" />}

      {marcador && (
        <span className={CLASSE_DO_MARCADOR}>
          {marcador.rotulo}
          <span className="sr-only">{marcador.explicacao}</span>
        </span>
      )}

      {no?.escolha && (
        <span className={CLASSE_DO_MARCADOR}>
          {MARCADOR_DE_ESCOLHA.rotulo}
          <span className="sr-only">{MARCADOR_DE_ESCOLHA.explicacao}</span>
        </span>
      )}

      {repeteNoXml && (
        <span className="ml-3 self-center font-sans text-aux text-muted">pode repetir</span>
      )}
    </div>
  )
})
