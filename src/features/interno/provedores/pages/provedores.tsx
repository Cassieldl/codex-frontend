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
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarProvedor } from '../../hooks/usePublicarProvedor'
import { ProvedorForm, type ProvedorFormDto } from '../components/ProvedorForm'
import { useCriarProvedor } from '../hooks/useCriarProvedor'
import { useProvedoresAdmin } from '../hooks/useProvedoresAdmin'
import type { ProvedorAdminListaItem } from '../types/provedorAdmin'
import { mensagemDeErroDeEscrita } from '../../utils/mensagemDeErroDeEscrita'

const TAMANHO_PAGINA_PADRAO = 25

/** Falha ao publicar ou despublicar, mostrada na linha do provedor que a causou. */
interface ErroDePublicacao {
  provedorId: number
  mensagem: string
}

export function ProvedoresPage() {
  const permissoes = usePermissoesInterno()
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)
  const [modalCriarAberto, setModalCriarAberto] = useState(false)
  const [erroCriar, setErroCriar] = useState<string | null>(null)
  const [erroDePublicacao, setErroDePublicacao] = useState<ErroDePublicacao | null>(null)

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
        onError: (erro) => setErroCriar(mensagemDeErroDeEscrita(erro)),
      },
    )
  }

  function alternarPublicacao(provedor: ProvedorAdminListaItem) {
    setErroDePublicacao(null)
    publicarProvedor.mutate(
      { id: provedor.id, publicado: !provedor.publicado, etag: provedor.etag },
      {
        onError: (falha) =>
          setErroDePublicacao({
            provedorId: provedor.id,
            mensagem: mensagemDeErroDeEscrita(falha, 'acao'),
          }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-titulo font-bold text-ink">Provedores</h1>
          <p className="text-sm text-muted">Cadastro de provedores, versões e avisos.</p>
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
          <TableRoot rotulo="Provedores">
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
                        onClick={() => alternarPublicacao(provedor)}
                      >
                        {provedor.publicado ? 'Despublicar' : 'Publicar'}
                      </Button>
                    )}
                    {erroDePublicacao?.provedorId === provedor.id && (
                      <p role="alert" className="mt-1 text-sm text-error-texto">
                        {erroDePublicacao.mensagem}
                      </p>
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
