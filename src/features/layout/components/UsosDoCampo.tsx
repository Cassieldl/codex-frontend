import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { ErrorState } from '../../../components/ui/ErrorState'
import { EtiquetaEstado } from '../../../components/ui/EtiquetaEstado'
import { RotuloDeCaminho } from '../../../components/ui/RotuloDeCaminho'
import { Skeleton } from '../../../components/ui/Skeleton'
import { ESTADO_PARA_ETIQUETA } from '../../provedores/utils/blocosDeCampos'
import { construirIdLinhaCampo } from '../../provedores/utils/destaqueAncora'
import { separarDestinos } from '../../provedores/utils/destinosXml'
import { useUsosDoCampoLayout } from '../hooks/useUsosDoCampoLayout'
import type { UsoCampoLayout } from '../types/layoutPublico'

export interface UsosDoCampoProps {
  campoSlug: string
  /** Slug já assentado pelo atraso da navegação; vem de quem não remonta ao navegar. */
  slugAssentado: string
  nomeDoCampo: string
}

const ROTULO_DE_SECAO = 'text-aux font-semibold tracking-wide text-muted uppercase'

const CLASSE_DA_TAG =
  'block font-mono text-[13px] font-semibold text-primary-medium [overflow-wrap:anywhere]'

const CLASSE_DO_LINK =
  'inline-flex min-h-9 shrink-0 items-center text-sm font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'

function DestinosDoUso({ destinoXml }: { destinoXml: string | null }) {
  const destinos = separarDestinos(destinoXml)

  if (destinos.length === 0) {
    return (
      <span className="block text-xs text-muted italic">sem destino no XML deste provedor</span>
    )
  }

  return (
    <>
      {destinos.map((destino, indice) =>
        destino.tipo === 'omitidos' ? (
          <span key={`omitidos-${indice}`} className="block text-xs text-muted italic">
            e mais destinos
          </span>
        ) : (
          <span key={destino.caminho} className="block">
            <span className={CLASSE_DA_TAG}>{destino.tag}</span>
            <span className="block text-xs text-muted [overflow-wrap:anywhere]">
              <RotuloDeCaminho texto={destino.caminho} />
            </span>
          </span>
        ),
      )}
    </>
  )
}

interface ItemDeUsoProps {
  uso: UsoCampoLayout
  campoSlug: string
  nomeDoCampo: string
}

function ItemDeUso({ uso, campoSlug, nomeDoCampo }: ItemDeUsoProps) {
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink">{uso.provedorNome}</span>
          <EtiquetaEstado estado={ESTADO_PARA_ETIQUETA[uso.estadoPreenchimento]} />
        </div>

        <div className="mt-1.5 flex flex-col gap-1.5">
          <DestinosDoUso destinoXml={uso.destinoXml} />
        </div>
      </div>

      <Link
        to="/provedores/$provedorSlug"
        params={{ provedorSlug: uso.provedorSlug }}
        hash={construirIdLinhaCampo(campoSlug)}
        aria-label={`Ver no provedor: ${nomeDoCampo} em ${uso.provedorNome}`}
        className={CLASSE_DO_LINK}
      >
        Ver no provedor
      </Link>
    </li>
  )
}

/**
 * Onde o campo do layout é usado, por provedor: a tag que o recebe, se o provedor o exige e o
 * atalho para a linha dele na página do provedor. Carregando, erro e vazio ficam dentro da seção:
 * o resto do modal já está pronto e não depende desta consulta.
 */
export function UsosDoCampo({ campoSlug, slugAssentado, nomeDoCampo }: UsosDoCampoProps) {
  const tituloId = useId()
  const { usos, isLoading, isError, refetch } = useUsosDoCampoLayout(campoSlug, slugAssentado)

  return (
    <section
      aria-labelledby={tituloId}
      className="rounded-[var(--radius-card)] border border-border p-4"
    >
      <h3 id={tituloId} className={ROTULO_DE_SECAO}>
        Como cada provedor usa este campo
      </h3>

      {isLoading ? (
        <div role="status" aria-busy="true" className="mt-3 flex flex-col gap-2">
          <span className="sr-only">Carregando os provedores que usam este campo…</span>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !usos ? (
        <div className="-my-6">
          <ErrorState
            message="Não foi possível carregar os provedores deste campo."
            onRetry={refetch}
          />
        </div>
      ) : usos.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nenhum provedor publicado usa este campo ainda.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {usos.map((uso) => (
            <ItemDeUso
              key={`${uso.provedorSlug}/${uso.versaoSlug}`}
              uso={uso}
              campoSlug={campoSlug}
              nomeDoCampo={nomeDoCampo}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
