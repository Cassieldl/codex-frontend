import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Modal } from '../../../../components/ui/Modal'
import { ModalConfirmacao } from '../../../../components/ui/ModalConfirmacao'
import { Pagination } from '../../../../components/ui/Pagination'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarErro } from '../../hooks/usePublicarErro'
import { etagNaColecao } from '../../utils/etagDeConcorrencia'
import { useEtagDeEnvio } from '../../utils/useEtagDeEnvio'
import { ErroForm } from '../components/ErroForm'
import { useAtualizarErro } from '../hooks/useAtualizarErro'
import { useCriarErro } from '../hooks/useCriarErro'
import { useErroAdminPorId } from '../hooks/useErroAdminPorId'
import { useErrosAdmin } from '../hooks/useErrosAdmin'
import { useOpcoesVersoesProvedorErro } from '../hooks/useOpcoesVersoesProvedorErro'
import { useRemoverErro } from '../hooks/useRemoverErro'
import type { AtualizarErroDto, ErroAdminListaItem, ErroFormDto } from '../types/erroAdmin'
import { mensagemDeErroDeEscrita } from '../../utils/mensagemDeErroDeEscrita'

const TAMANHO_PAGINA_PADRAO = 25

/** Falha ao publicar ou despublicar, mostrada na linha do erro que a causou. */
interface ErroDePublicacao {
  erroId: number
  mensagem: string
}

/** O código fica só leitura na edição e não vai no corpo: o backend não o aceita no PUT. */
function paraAtualizacao({ codigo: _codigo, ...dto }: ErroFormDto): AtualizarErroDto {
  return dto
}

export function ErrosPage() {
  const permissoes = usePermissoesInterno()
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)

  const { data, isLoading, isError, refetch } = useErrosAdmin({ pagina, tamanhoPagina })

  const publicarErro = usePublicarErro()
  const criarErro = useCriarErro()
  const atualizarErro = useAtualizarErro()
  const removerErro = useRemoverErro()

  // Na edição guarda só o id: o item da lista não traz o agregado que o formulário precisa.
  const [modalAberto, setModalAberto] = useState<'novo' | number | null>(null)
  const opcoesVersoes = useOpcoesVersoesProvedorErro(modalAberto !== null)
  const [erroServidor, setErroServidor] = useState<string | null>(null)
  const [erroParaRemover, setErroParaRemover] = useState<ErroAdminListaItem | null>(null)
  const [erroDeRemocao, setErroDeRemocao] = useState<string | null>(null)
  const [erroDePublicacao, setErroDePublicacao] = useState<ErroDePublicacao | null>(null)

  const idEmEdicao = typeof modalAberto === 'number' ? modalAberto : 0
  const detalheEmEdicao = useErroAdminPorId(idEmEdicao)
  const envioDaEdicao = useEtagDeEnvio(idEmEdicao || null, detalheEmEdicao.data?.etag)

  const envioDaRemocao = useEtagDeEnvio(
    erroParaRemover?.id ?? null,
    etagNaColecao(data?.items, erroParaRemover),
  )

  function aoSalvar(dto: ErroFormDto) {
    setErroServidor(null)

    if (modalAberto === 'novo') {
      criarErro.mutate(dto, {
        onSuccess: () => setModalAberto(null),
        onError: (erro) => setErroServidor(mensagemDeErroDeEscrita(erro)),
      })
      return
    }

    const erroEmEdicao = detalheEmEdicao.data
    if (erroEmEdicao) {
      atualizarErro.mutate(
        { id: erroEmEdicao.id, dto: paraAtualizacao(dto), etag: envioDaEdicao.etag },
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

  /** A mutation só dispara depois da confirmação — nunca do clique na lista. */
  function confirmarRemocao() {
    if (!erroParaRemover) return

    setErroDeRemocao(null)
    removerErro.mutate(
      { id: erroParaRemover.id, etag: envioDaRemocao.etag },
      {
        onSuccess: () => setErroParaRemover(null),
        onError: (falha) => {
          envioDaRemocao.registrarErro(falha)
          setErroDeRemocao(mensagemDeErroDeEscrita(falha, 'acao'))
        },
      },
    )
  }

  function alternarPublicacao(erro: ErroAdminListaItem) {
    setErroDePublicacao(null)
    publicarErro.mutate(
      { id: erro.id, publicado: !erro.publicado, etag: erro.etag },
      {
        onError: (falha) =>
          setErroDePublicacao({
            erroId: erro.id,
            mensagem: mensagemDeErroDeEscrita(falha, 'acao'),
          }),
      },
    )
  }

  const propsDoFormulario = {
    opcoesVersoesProvedor: opcoesVersoes.opcoes,
    statusOpcoesVersoes: opcoesVersoes.status,
    onRecarregarOpcoesVersoes: opcoesVersoes.refetch,
    opcoesCamposLayout: [],
    onSubmit: aoSalvar,
    onCancel: () => setModalAberto(null),
    isSubmitting: criarErro.isPending || atualizarErro.isPending,
    erroServidor,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-titulo font-bold text-ink">Erros conhecidos</h1>
          <p className="text-sm text-muted">Catálogo de rejeições, mensagens e soluções.</p>
        </div>
        {permissoes.erros.adicionar && (
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalAberto('novo')}>
            Novo erro
          </Button>
        )}
      </div>

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando erros…</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState message="Nenhum erro cadastrado ainda." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <TableRoot rotulo="Erros conhecidos">
            <TableHeader>
              <tr>
                <TableCell header>Código</TableCell>
                <TableCell header>Título</TableCell>
                <TableCell header>Origem</TableCell>
                <TableCell header>Publicação</TableCell>
                <TableCell header>Ações</TableCell>
              </tr>
            </TableHeader>
            <tbody>
              {data.items.map((erro) => (
                <TableRow key={erro.id}>
                  <TableCell className="font-mono">{erro.codigo}</TableCell>
                  <TableCell>{erro.titulo}</TableCell>
                  <TableCell>{erro.origem}</TableCell>
                  <TableCell>
                    <EtiquetaPublicacao
                      publicadoProprio={erro.publicado}
                      publicadoEfetivo={erro.publicado}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {permissoes.erros.atualizar && (
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Editar erro ${erro.codigo}`}
                          onClick={() => setModalAberto(erro.id)}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                      {permissoes.erros.publicar && (
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={
                            publicarErro.isPending && publicarErro.variables?.id === erro.id
                          }
                          onClick={() => alternarPublicacao(erro)}
                        >
                          {erro.publicado ? 'Despublicar' : 'Publicar'}
                        </Button>
                      )}
                      {permissoes.erros.remover && (
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Remover erro ${erro.codigo}`}
                          onClick={() => setErroParaRemover(erro)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    {erroDePublicacao?.erroId === erro.id && (
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
        title={modalAberto === 'novo' ? 'Novo erro' : 'Editar erro'}
        size="lg"
      >
        {modalAberto === 'novo' && <ErroForm {...propsDoFormulario} />}

        {idEmEdicao > 0 && detalheEmEdicao.isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Carregando erro…</span>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {idEmEdicao > 0 && detalheEmEdicao.isError && (
          <ErrorState onRetry={() => detalheEmEdicao.refetch()} />
        )}

        {idEmEdicao > 0 && detalheEmEdicao.data && (
          <ErroForm
            key={detalheEmEdicao.data.id}
            initialData={detalheEmEdicao.data}
            {...propsDoFormulario}
          />
        )}
      </Modal>

      {/*
        A mutation ia direto do clique na lista, sem confirmação e sem tratamento de erro: um
        toque na lixeira apagava um erro publicado, e um 409 de etag velho não dizia nada. Aqui a
        falha fica no próprio diálogo, que é onde quem confirmou está olhando.
      */}
      <ModalConfirmacao
        isOpen={erroParaRemover !== null}
        title="Remover erro"
        message={
          erroParaRemover?.publicado
            ? `O erro ${erroParaRemover.codigo} está publicado e sai do portal agora.`
            : `O erro ${erroParaRemover?.codigo} é removido definitivamente.`
        }
        isConfirming={removerErro.isPending}
        erro={erroDeRemocao}
        onConfirm={confirmarRemocao}
        onCancel={() => {
          setErroParaRemover(null)
          setErroDeRemocao(null)
        }}
      />
    </div>
  )
}
