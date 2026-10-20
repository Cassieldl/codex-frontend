import { Link } from '@tanstack/react-router'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Modal } from '../../../../components/ui/Modal'
import { Pagination } from '../../../../components/ui/Pagination'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarVersaoLayout } from '../../hooks/usePublicarVersaoLayout'
import { etagNaColecao } from '../../utils/etagDeConcorrencia'
import { useEtagDeEnvio } from '../../utils/useEtagDeEnvio'
import { VersaoLayoutForm, type VersaoLayoutFormDto } from '../components/VersaoLayoutForm'
import { useAtualizarVersaoLayout } from '../hooks/useAtualizarVersaoLayout'
import { useCriarVersaoLayout } from '../hooks/useCriarVersaoLayout'
import { useVersoesLayout } from '../hooks/useVersoesLayout'
import type { VersaoLayoutAdmin } from '../types/versaoLayoutAdmin'
import { mensagemDeErroDeEscrita } from '../../utils/mensagemDeErroDeEscrita'

const TAMANHO_PAGINA_PADRAO = 25

/** Falha ao publicar ou despublicar, mostrada na linha da versão que a causou. */
interface ErroDePublicacao {
  versaoLayoutId: number
  mensagem: string
}

export function CamposLayoutPage() {
  const permissoes = usePermissoesInterno()
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)
  const [modalAberto, setModalAberto] = useState<'novo' | VersaoLayoutAdmin | null>(null)
  const [erroServidor, setErroServidor] = useState<string | null>(null)
  const [erroDePublicacao, setErroDePublicacao] = useState<ErroDePublicacao | null>(null)

  const { data, isLoading, isError, refetch } = useVersoesLayout({ pagina, tamanhoPagina })
  const criarVersaoLayout = useCriarVersaoLayout()
  const atualizarVersaoLayout = useAtualizarVersaoLayout()
  const publicarVersaoLayout = usePublicarVersaoLayout()

  const versaoEmEdicao = typeof modalAberto === 'object' ? modalAberto : null
  const envioDaEdicao = useEtagDeEnvio(
    versaoEmEdicao?.id ?? null,
    etagNaColecao(data?.items, versaoEmEdicao),
  )

  function aoSalvar(dto: VersaoLayoutFormDto) {
    setErroServidor(null)

    if (modalAberto === 'novo') {
      criarVersaoLayout.mutate(
        { rotulo: dto.rotulo, descricao: dto.descricao },
        {
          onSuccess: () => setModalAberto(null),
          onError: (erro) => setErroServidor(mensagemDeErroDeEscrita(erro)),
        },
      )
      return
    }

    if (modalAberto) {
      // `estado` é a transição de I15c — o backend aceita o campo no
      // `AtualizarVersaoLayoutDto` e responde 422 quando a transição é
      // inválida (erro exibido no próprio modal, sem limpar o formulário).
      atualizarVersaoLayout.mutate(
        {
          id: modalAberto.id,
          dto: { rotulo: dto.rotulo, descricao: dto.descricao, estado: dto.estado },
          etag: envioDaEdicao.etag,
        },
        {
          onSuccess: () => setModalAberto(null),
          onError: (erro) => {
            envioDaEdicao.registrarErro(erro)
            setErroServidor(mensagemDeErroDeEscrita(erro))
          },
        },
      )
    }
  }

  function alternarPublicacao(versaoLayout: VersaoLayoutAdmin) {
    setErroDePublicacao(null)
    publicarVersaoLayout.mutate(
      { id: versaoLayout.id, publicado: !versaoLayout.publicado, etag: versaoLayout.etag },
      {
        onError: (falha) =>
          setErroDePublicacao({
            versaoLayoutId: versaoLayout.id,
            mensagem: mensagemDeErroDeEscrita(falha, 'acao'),
          }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-titulo font-bold text-ink">Campos do layout</h1>
          <p className="text-sm text-muted">
            Versões do Layout InvoiCy e vocabulário canônico de campos.
          </p>
        </div>
        {permissoes.versoesLayout.adicionar && (
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalAberto('novo')}>
            Nova versão do layout
          </Button>
        )}
      </div>

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando versões do layout…</span>
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState message="Nenhuma versão do Layout InvoiCy cadastrada ainda." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <TableRoot rotulo="Versões do Layout InvoiCy">
            <TableHeader>
              <tr>
                <TableCell header>Rótulo</TableCell>
                <TableCell header>Estado</TableCell>
                <TableCell header>Publicação</TableCell>
                <TableCell header>Ações</TableCell>
              </tr>
            </TableHeader>
            <tbody>
              {data.items.map((versaoLayout) => (
                <TableRow key={versaoLayout.id}>
                  <TableCell>
                    <Link
                      to="/interno/campos-layout/$versaoLayoutId"
                      params={{ versaoLayoutId: String(versaoLayout.id) }}
                      className="font-medium text-primary-medium hover:underline"
                    >
                      {versaoLayout.rotulo}
                    </Link>
                  </TableCell>
                  <TableCell>{versaoLayout.estado}</TableCell>
                  <TableCell>
                    <EtiquetaPublicacao
                      publicadoProprio={versaoLayout.publicado}
                      publicadoEfetivo={versaoLayout.publicado}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {permissoes.versoesLayout.atualizar && (
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Editar versão do layout ${versaoLayout.rotulo}`}
                          onClick={() => setModalAberto(versaoLayout)}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                      {permissoes.versoesLayout.publicar && (
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={
                            publicarVersaoLayout.isPending &&
                            publicarVersaoLayout.variables?.id === versaoLayout.id
                          }
                          onClick={() => alternarPublicacao(versaoLayout)}
                        >
                          {versaoLayout.publicado ? 'Despublicar' : 'Publicar'}
                        </Button>
                      )}
                    </div>
                    {erroDePublicacao?.versaoLayoutId === versaoLayout.id && (
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
        isOpen={modalAberto !== null}
        onClose={() => setModalAberto(null)}
        title={
          modalAberto === 'novo'
            ? 'Nova versão do Layout InvoiCy'
            : 'Editar versão do Layout InvoiCy'
        }
      >
        <VersaoLayoutForm
          modo={modalAberto === 'novo' ? 'criar' : 'editar'}
          initialData={modalAberto === 'novo' ? undefined : (modalAberto ?? undefined)}
          onSubmit={aoSalvar}
          onCancel={() => setModalAberto(null)}
          isSubmitting={criarVersaoLayout.isPending || atualizarVersaoLayout.isPending}
          erroServidor={erroServidor}
        />
      </Modal>
    </div>
  )
}
