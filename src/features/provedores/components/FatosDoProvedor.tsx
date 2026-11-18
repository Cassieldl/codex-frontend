import clsx from 'clsx'
import { ShieldCheck, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatarDataCurta } from '../../../utils/formatarDataVerificacao'
import { extrairNumeroDaVersao } from '../../../utils/versaoDoLayout'
import { useLayoutIndice } from '../../layout/hooks/useLayoutIndice'
import type { CategoriaProvedor } from '../types/provedor'
import { descreverLayoutDoProvedor } from '../utils/layoutDoProvedor'

export interface FatosDoProvedorProps {
  categoria: CategoriaProvedor
  /** Ausentes quando o provedor ainda não tem versão publicada. */
  versaoRotulo?: string
  verificadoEm?: string | null
  /** Vem do conteúdo da versão: o chip do layout só aparece depois que ele carrega. */
  versaoLayoutRotulo?: string
}

const CLASSE_CHIP =
  'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs font-semibold'

const CLASSE_CHIP_NEUTRO = clsx(CLASSE_CHIP, 'border-transparent bg-alert-info text-primary-medium')

function Chip({
  children,
  className = CLASSE_CHIP_NEUTRO,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <li>
      <span className={className}>{children}</span>
    </li>
  )
}

/** Só este chip consulta o índice do layout: provedor sem versão publicada não faz a requisição. */
function ChipLayout({ versaoLayoutRotulo }: { versaoLayoutRotulo: string }) {
  const { data: indice } = useLayoutIndice()
  const { texto, desatualizado } = descreverLayoutDoProvedor(
    versaoLayoutRotulo,
    indice?.vigente?.rotulo ?? null,
  )

  if (!desatualizado) return <Chip>{texto}</Chip>

  return (
    <Chip
      className={clsx(
        CLASSE_CHIP,
        'border-transparent bg-alert-warning text-severidade-alerta-texto',
      )}
    >
      <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      {texto}
    </Chip>
  )
}

/** Faixa de fatos logo abaixo do nome do provedor: o que decide a leitura, sem prosa. */
export function FatosDoProvedor({
  categoria,
  versaoRotulo,
  verificadoEm,
  versaoLayoutRotulo,
}: FatosDoProvedorProps) {
  return (
    <ul aria-label="Resumo do provedor" className="flex flex-wrap items-center gap-2">
      <Chip>{categoria === 'Nacional' ? 'Nacional' : 'Próprio'}</Chip>

      {versaoRotulo && <Chip>Versão {extrairNumeroDaVersao(versaoRotulo)}</Chip>}

      {versaoLayoutRotulo && <ChipLayout versaoLayoutRotulo={versaoLayoutRotulo} />}

      {verificadoEm && (
        <Chip>
          <ShieldCheck className="size-3.5 shrink-0 text-primary-medium" aria-hidden="true" />
          Verificado {formatarDataCurta(verificadoEm)}
        </Chip>
      )}
    </ul>
  )
}
