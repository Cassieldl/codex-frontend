import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { CLASSE_HOVER_DO_CARD_CLICAVEL } from '../../../components/ui/classesDeCard'
import { cn } from '../../../lib/cn'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import type { LayoutIndice } from '../types/layoutPublico'
import { montarCartoesDeVersao } from '../utils/cartoesDeVersao'
import type { CartaoDeVersao } from '../utils/cartoesDeVersao'
import { SeloEstadoDaVersao } from './SeloEstadoDaVersao'

export interface CartoesDeVersaoDoLayoutProps {
  indice: LayoutIndice
}

function CartaoDaVersao({ versao, ehVigente, fatos }: CartaoDeVersao) {
  return (
    <Link
      to="/layout/$versaoSlug"
      params={{ versaoSlug: versao.slug }}
      activeOptions={{ exact: true }}
      data-cartao-de-versao={versao.slug}
      className={cn(
        'flex h-full flex-col gap-2.5 rounded-[var(--radius-card)] bg-white px-6 py-5 text-primary no-underline',
        CLASSE_HOVER_DO_CARD_CLICAVEL,
        ehVigente ? 'border-2 border-primary-medium' : 'border border-border',
      )}
    >
      {/* Os espaços entre os blocos separam as partes no nome acessível do link. */}
      <span className="flex items-center justify-between gap-3">
        <span className="text-subtitulo font-extrabold">
          {formatarVersaoLayout(versao.rotulo, { maiuscula: true })}
        </span>{' '}
        <SeloEstadoDaVersao estado={versao.estado} />
      </span>{' '}
      <span className="text-sm text-muted">{fatos.join(' · ')}</span>{' '}
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-primary-medium">
        Abrir dicionário
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  )
}

/** Um cartão por versão publicada, vigente primeiro; o cartão inteiro leva ao dicionário. */
export function CartoesDeVersaoDoLayout({ indice }: CartoesDeVersaoDoLayoutProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
      {montarCartoesDeVersao(indice).map((cartao) => (
        <li key={cartao.versao.slug}>
          <CartaoDaVersao {...cartao} />
        </li>
      ))}
    </ul>
  )
}
