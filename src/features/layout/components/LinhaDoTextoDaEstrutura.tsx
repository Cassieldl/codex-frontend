import { ChevronRight } from 'lucide-react'
import { memo } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { realcarTrecho } from '../../../utils/realceDeSintaxe'
import type { TipoDoTrecho } from '../../../utils/realceDeSintaxe'
import { construirIdLinhaCampo } from '../../provedores/utils/destaqueAncora'
import type { FormatoDaEstrutura, PresencaDoNo } from '../types/estruturaLayout'
import type { LinhaDaEstrutura } from '../utils/linhasDaEstrutura'
import { SeloReformaTributaria } from '../../../components/ui/SeloReformaTributaria'

/** `clara` é o texto do Layout; `escura` é o painel de código do envio modelo, com cores. */
export type SuperficieDaEstrutura = 'clara' | 'escura'

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
  /** Texto do selo do campo novo nesta versão ("novo na versão 9"); `null` sem o selo. */
  marcaDeNovo?: string | null
  superficie?: SuperficieDaEstrutura
  /** Precisa ser estável: sem isso o `memo` não evita nenhum render. */
  onAlternarGrupo: (indice: number) => void
  onAbrirTag: (campoSlug: string, indice: number) => void
}

export type AcaoDaTag = 'verbete' | 'linhaDaTabela'

const INDENTACAO = '  '

const CLASSE_DA_TAG: Record<SuperficieDaEstrutura, string> = {
  clara:
    'font-semibold text-primary-medium underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-hover',
  escura:
    'font-semibold text-codigo-tag underline decoration-dotted underline-offset-[3px] hover:text-white hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-hover',
}

const CLASSE_DO_TRECHO: Record<TipoDoTrecho, string> = {
  tag: 'text-codigo-tag',
  valor: 'text-codigo-valor',
  pontuacao: 'text-codigo-pontuacao',
}

const CLASSE_DO_NUMERO: Record<SuperficieDaEstrutura, string> = {
  clara: 'text-muted',
  escura: 'text-codigo-pontuacao',
}

const CLASSE_DO_CONTROLE_DO_GRUPO: Record<SuperficieDaEstrutura, string> = {
  clara: 'text-muted hover:shadow-hover',
  escura: 'text-codigo-pontuacao hover:text-white',
}

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

/** Etiqueta do marcador sem posição: a legenda usa a mesma, fora da linha do texto. */
export const CLASSE_DA_ETIQUETA_DE_MARCADOR =
  'inline-flex shrink-0 items-center rounded-[var(--radius-pill)] border border-border-control px-2 font-sans text-aux font-semibold tracking-wide text-ink uppercase'

const CLASSE_DA_ETIQUETA_DE_MARCADOR_NO_ESCURO =
  'inline-flex shrink-0 items-center rounded-[var(--radius-pill)] border border-codigo-pontuacao px-2 font-sans text-aux font-semibold tracking-wide text-codigo-texto uppercase'

export const CLASSE_DO_MARCADOR = `ml-3 self-center ${CLASSE_DA_ETIQUETA_DE_MARCADOR}`

const CLASSE_DO_MARCADOR_POR_SUPERFICIE: Record<SuperficieDaEstrutura, string> = {
  clara: CLASSE_DO_MARCADOR,
  escura: `ml-3 self-center ${CLASSE_DA_ETIQUETA_DE_MARCADOR_NO_ESCURO}`,
}

/** Mesmo selo tracejado do campo novo no dicionário. */
export const CLASSE_DA_ETIQUETA_DE_NOVO =
  'inline-flex shrink-0 items-center rounded-[var(--radius-pill)] border border-dashed border-primary px-2 py-px font-sans text-aux font-semibold tracking-wide text-primary uppercase'

/** No claro o pedaço sai como texto puro; no escuro, colorido por tag, valor e pontuação. */
function pedacoDoTexto(
  texto: string,
  formato: FormatoDaEstrutura,
  superficie: SuperficieDaEstrutura,
  aposNome = false,
): ReactNode {
  if (superficie === 'clara' || texto === '') return texto

  return realcarTrecho(texto, formato, aposNome).map((trecho, posicao) => (
    <span key={posicao} className={CLASSE_DO_TRECHO[trecho.tipo]}>
      {trecho.texto}
    </span>
  ))
}

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
  marcaDeNovo = null,
  superficie = 'clara',
  onAlternarGrupo,
  onAbrirTag,
}: LinhaDoTextoDaEstruturaProps) {
  const { no } = linha
  const campoSlug = no?.campoSlug ?? null
  const ehGrupo = linha.fimDoGrupo !== null
  const marcador = no && no.formato !== 'ambos' ? MARCADOR_DE_PRESENCA[no.formato] : null
  // No XML a tag que repete aparece uma vez; no JSON o array já diz isso.
  const repeteNoXml = formato === 'xml' && no?.repete === true
  const escura = superficie === 'escura'
  const classeDoMarcador = CLASSE_DO_MARCADOR_POR_SUPERFICIE[superficie]

  return (
    <div
      id={idDaAncora ?? undefined}
      data-linha={indice}
      className={cn(
        'flex min-w-max items-start border-l-[3px] pr-4',
        destacada
          ? cn('border-l-accent', escura ? 'bg-white/10' : 'bg-highlight-anchor')
          : 'border-l-transparent',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'w-12 shrink-0 pr-3 text-right tabular-nums select-none',
          CLASSE_DO_NUMERO[superficie],
        )}
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
            className={cn(
              'mt-1 inline-flex size-4 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-hover',
              CLASSE_DO_CONTROLE_DO_GRUPO[superficie],
            )}
          >
            <ChevronRight
              aria-hidden="true"
              className={cn('size-3.5 transition-transform', !recolhido && 'rotate-90')}
            />
          </button>
        )}
      </span>

      <span className={cn('whitespace-pre', escura ? 'text-codigo-texto' : 'text-ink')}>
        {INDENTACAO.repeat(linha.profundidade)}
        {pedacoDoTexto(linha.prefixo, formato, superficie)}
        {no &&
          (campoSlug === null || acaoDaTag === null ? (
            escura ? (
              <span className={CLASSE_DO_TRECHO.tag}>{no.nome}</span>
            ) : (
              no.nome
            )
          ) : acaoDaTag === 'verbete' ? (
            <button
              type="button"
              data-botao-da-tag=""
              aria-haspopup="dialog"
              onClick={() => onAbrirTag(campoSlug, indice)}
              className={CLASSE_DA_TAG[superficie]}
            >
              {no.nome}
            </button>
          ) : (
            <a
              href={`#${construirIdLinhaCampo(campoSlug)}`}
              aria-label={`${no.nome}, ver o campo na tabela`}
              className={CLASSE_DA_TAG[superficie]}
            >
              {no.nome}
            </a>
          ))}
        {pedacoDoTexto(linha.sufixo, formato, superficie, no !== null)}
        {recolhido && textoDoFechamento !== null && (
          <>
            <span className={CLASSE_DO_NUMERO[superficie]}>…</span>
            {pedacoDoTexto(textoDoFechamento, formato, superficie)}
          </>
        )}
      </span>

      {marcaDeNovo !== null && (
        <span className={`ml-3 self-center ${CLASSE_DA_ETIQUETA_DE_NOVO}`}>{marcaDeNovo}</span>
      )}

      {daReformaTributaria && (
        <SeloReformaTributaria
          className={cn('ml-3 self-center', escura && 'ring-1 ring-codigo-texto')}
        />
      )}

      {marcador && (
        <span className={classeDoMarcador}>
          {marcador.rotulo}
          <span className="sr-only">{marcador.explicacao}</span>
        </span>
      )}

      {no?.escolha && (
        <span className={classeDoMarcador}>
          {MARCADOR_DE_ESCOLHA.rotulo}
          <span className="sr-only">{MARCADOR_DE_ESCOLHA.explicacao}</span>
        </span>
      )}

      {repeteNoXml && (
        <span className={cn('ml-3 self-center font-sans text-aux', CLASSE_DO_NUMERO[superficie])}>
          pode repetir
        </span>
      )}
    </div>
  )
})
