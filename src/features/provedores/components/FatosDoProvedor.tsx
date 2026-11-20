import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatarDataCurta } from '../../../utils/formatarDataVerificacao'
import { extrairNumeroDaVersao, formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import { useLayoutIndice } from '../../layout/hooks/useLayoutIndice'
import type { CategoriaProvedor } from '../types/provedor'
import { vigenteAFrenteDoProvedor } from '../utils/layoutDoProvedor'

/** Estado do detalhe da fonte: o botão fica na linha dos fatos e o painel, abaixo do nome. */
export interface FonteDoProvedor {
  aberta: boolean
  idDoPainel: string
  aoAlternar: () => void
}

export interface FatosDoProvedorProps {
  categoria: CategoriaProvedor
  /** Ausentes quando o provedor não tem versão publicada. */
  versaoRotulo?: string
  verificadoEm?: string | null
  /** Vem do conteúdo da versão: o chip do layout só aparece depois que ele carrega. */
  versaoLayoutRotulo?: string
  /** Ausente quando a versão não tem texto de fonte. */
  fonte?: FonteDoProvedor
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <li>
      <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-alert-info px-3 py-1 text-xs font-semibold text-primary-medium">
        {children}
      </span>
    </li>
  )
}

/**
 * Chip do layout só com o mapeamento em dia: defasado, quem fala é a faixa abaixo do nome. Só ele
 * consulta o índice do layout, então provedor sem versão publicada não faz a requisição.
 */
function ChipLayoutEmDia({ versaoLayoutRotulo }: { versaoLayoutRotulo: string }) {
  const { data: indice, isError } = useLayoutIndice()

  if (!indice && !isError) return null
  if (vigenteAFrenteDoProvedor(versaoLayoutRotulo, indice)) return null

  return <Chip>Layout InvoiCy {formatarVersaoLayout(versaoLayoutRotulo)}</Chip>
}

function VerificacaoEFonte({
  verificadoEm,
  fonte,
}: Pick<FatosDoProvedorProps, 'verificadoEm' | 'fonte'>) {
  if (!verificadoEm && !fonte) return null

  return (
    <li className="flex items-center gap-1.5 text-sm text-muted">
      {verificadoEm && (
        <>
          <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
          Verificado em {formatarDataCurta(verificadoEm)}
        </>
      )}
      {verificadoEm && fonte && <span aria-hidden="true">·</span>}
      {fonte && (
        <button
          type="button"
          aria-label="Detalhes da fonte"
          aria-expanded={fonte.aberta}
          aria-controls={fonte.idDoPainel}
          onClick={fonte.aoAlternar}
          className="rounded py-1 font-semibold text-primary-medium underline underline-offset-4 hover:text-primary-light hover:decoration-2"
        >
          {verificadoEm ? 'fonte' : 'Fonte'}
        </button>
      )}
    </li>
  )
}

/** Faixa de fatos ao lado do nome do provedor: o que decide a leitura, sem prosa. */
export function FatosDoProvedor({
  categoria,
  versaoRotulo,
  verificadoEm,
  versaoLayoutRotulo,
  fonte,
}: FatosDoProvedorProps) {
  return (
    <ul aria-label="Resumo do provedor" className="flex flex-wrap items-center gap-2">
      <Chip>{categoria === 'Nacional' ? 'Nacional' : 'Próprio'}</Chip>

      {versaoRotulo && <Chip>Versão {extrairNumeroDaVersao(versaoRotulo)}</Chip>}

      {versaoLayoutRotulo && <ChipLayoutEmDia versaoLayoutRotulo={versaoLayoutRotulo} />}

      <VerificacaoEFonte verificadoEm={verificadoEm} fonte={fonte} />
    </ul>
  )
}
