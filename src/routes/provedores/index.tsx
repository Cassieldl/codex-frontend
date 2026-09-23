import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { CabecalhoPublico } from '../../components/layout/CabecalhoPublico'
import { ID_CONTEUDO_PRINCIPAL } from '../../components/layout/PularParaConteudo'
import { RodapeContextual } from '../../components/layout/RodapeContextual'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Pagination } from '../../components/ui/Pagination'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { CampoBusca } from '../../features/busca/components/CampoBusca'
import { ListaProvedores } from '../../features/provedores/components/ListaProvedores'
import { useProvedores } from '../../features/provedores/hooks/useProvedores'

const CATEGORIA_OPTIONS = [
  { value: '', label: 'Todas as categorias' },
  { value: 'Nacional', label: 'Nacional' },
  { value: 'Proprio', label: 'Próprio' },
]

const TAMANHO_PAGINA_PADRAO = 25

export const provedoresSearchSchema = z.object({
  q: z.string().optional(),
  categoria: z.enum(['Nacional', 'Proprio']).optional(),
  pagina: z.coerce.number().int().min(1).catch(1),
  /** PQ-10 — nunca lido pela aplicação, só para o router não descartar o parâmetro. */
  origem: z.string().optional(),
})

export const Route = createFileRoute('/provedores/')({
  validateSearch: provedoresSearchSchema,
  component: ProvedoresPage,
})

function ProvedoresPage() {
  const { q, categoria, pagina } = Route.useSearch()
  const navigate = Route.useNavigate()

  const [termo, setTermo] = useState(q ?? '')
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)

  const { data, isLoading, isError, refetch } = useProvedores({
    q: q || undefined,
    categoria,
    pagina,
    tamanhoPagina,
  })

  function aoBuscarSubmit() {
    navigate({ search: (anterior) => ({ ...anterior, q: termo || undefined, pagina: 1 }) })
  }

  function aoMudarCategoria(valor: string) {
    navigate({
      search: (anterior) => ({
        ...anterior,
        categoria: (valor || undefined) as 'Nacional' | 'Proprio' | undefined,
        pagina: 1,
      }),
    })
  }

  function aoMudarTamanhoPagina(novoTamanho: number) {
    setTamanhoPagina(novoTamanho)
    navigate({ search: (anterior) => ({ ...anterior, pagina: 1 }) })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main
        id={ID_CONTEUDO_PRINCIPAL}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-titulo font-bold text-ink">Provedores</h1>
          <p className="text-sm text-muted">
            Catálogo de provedores de NFS-e integrados ao InvoiCy — todo provedor listado aqui já
            está ativo, sem indicação de status.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <CampoBusca
              valor={termo}
              onValorChange={setTermo}
              onSubmit={aoBuscarSubmit}
              placeholder="Buscar por nome ou apelido do provedor"
              rotuloOculto="Buscar provedor"
            />
          </div>
          <Select
            label="Categoria"
            options={CATEGORIA_OPTIONS}
            value={categoria ?? ''}
            onValueChange={aoMudarCategoria}
          />
        </div>

        {isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Carregando provedores…</span>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && data && data.items.length === 0 && (
          <EmptyState message="Nenhum provedor encontrado com esse filtro." />
        )}

        {!isLoading && !isError && data && data.items.length > 0 && (
          <>
            <ListaProvedores provedores={data.items} />
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              totalCount={data.totalCount}
              totalPages={data.totalPages}
              onPageChange={(novaPagina) =>
                navigate({ search: (anterior) => ({ ...anterior, pagina: novaPagina }) })
              }
              onPageSizeChange={aoMudarTamanhoPagina}
            />
          </>
        )}
      </main>

      <RodapeContextual contexto={{ tipo: 'provedores' }} />
    </div>
  )
}
