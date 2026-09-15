import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Modal } from '../../../../components/ui/Modal'
import { Pagination } from '../../../../components/ui/Pagination'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { Button } from '../../../../components/ui/Button'
import { handleApiError } from '../../../../utils/handleApiError'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarProvedor } from '../../hooks/usePublicarProvedor'
import { ProvedorForm, type ProvedorFormDto } from '../components/ProvedorForm'
import { useCriarProvedor } from '../hooks/useCriarProvedor'
import { useProvedoresAdmin } from '../hooks/useProvedoresAdmin'

const TAMANHO_PAGINA_PADRAO = 25

export function ProvedoresPage() {
  const permissoes = usePermissoesInterno()
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)
  const [modalCriarAberto, setModalCriarAberto] = useState(false)
  const [erroCriar, setErroCriar] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useProvedoresAdmin({ pagina, tamanhoPagina })
  const criarProvedor = useCriarProvedor()
  const publicarProvedor = usePublicarProvedor()

  function aoCriarProvedor(dto: ProvedorFormDto) {
    setErroCriar(null)
    criarProvedor.mutate(
      {
        nome: dto.nome,
        identificadorInvoicy: dto.identificadorInvoicy ?? '',
        categoria: dto.categoria,
        aliases: dto.aliases,
      },
      {
        onSuccess: () => setModalCriarAberto(false),
        onError: (erro) => setErroCriar(handleApiError(erro)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-titulo font-bold text-ink">Provedores</h1>
          <p className="text-sm text-ink/60">Cadastro de provedores, versões e avisos.</p>
        </div>
        {permissoes.provedores.adicionar && (
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalCriarAberto(true)}>
            Novo provedor
          </Button>
        )}
      </div>

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando provedores…</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState message="Nenhum provedor cadastrado ainda." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <TableRoot>
            <TableHeader>
              <tr>
                <TableCell header>Nome</TableCell>
                <TableCell header>Categoria</TableCell>
                <TableCell header>Identificador InvoiCy</TableCell>
                <TableCell header>Publicação</TableCell>
                <TableCell header>Ações</TableCell>
              </tr>
            </TableHeader>
            <tbody>
              {data.items.map((provedor) => (
                <TableRow key={provedor.id}>
                  <TableCell>
                    <Link
                      to="/interno/provedores/$provedorId"
                      params={{ provedorId: String(provedor.id) }}
                      className="font-medium text-primary-medium hover:underline"
                    >
                      {provedor.nome}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {provedor.categoria === 'Nacional' ? 'Nacional' : 'Próprio'}
                  </TableCell>
                  <TableCell>{provedor.identificadorInvoicy}</TableCell>
                  <TableCell>
                    <EtiquetaPublicacao
                      publicadoProprio={provedor.publicado}
                      publicadoEfetivo={provedor.publicado}
                    />
                  </TableCell>
                  <TableCell>
                    {permissoes.provedores.publicar && (
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={
                          publicarProvedor.isPending &&
                          publicarProvedor.variables?.id === provedor.id
                        }
                        onClick={() =>
                          publicarProvedor.mutate({
                            id: provedor.id,
                            publicado: !provedor.publicado,
                            etag: provedor.etag,
                          })
                        }
                      >
                        {provedor.publicado ? 'Despublicar' : 'Publicar'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </TableRoot>

          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            totalCount={data.totalCount}
            totalPages={data.totalPages}
            onPageChange={setPagina}
            onPageSizeChange={(novoTamanho) => {
              setTamanhoPagina(novoTamanho)
              setPagina(1)
            }}
          />
        </>
      )}

      <Modal
        isOpen={modalCriarAberto}
        onClose={() => setModalCriarAberto(false)}
        title="Novo provedor"
      >
        <ProvedorForm
          onSubmit={aoCriarProvedor}
          onCancel={() => setModalCriarAberto(false)}
          isSubmitting={criarProvedor.isPending}
          erroServidor={erroCriar}
        />
      </Modal>
    </div>
  )
}
