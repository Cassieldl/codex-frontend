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
import { handleApiError } from '../../../../utils/handleApiError'
import { useVersoesProvedorAdmin } from '../../provedores/hooks/useVersoesProvedorAdmin'
import { useProvedoresAdmin } from '../../provedores/hooks/useProvedoresAdmin'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarErro } from '../../hooks/usePublicarErro'
import { ErroForm, type OpcaoVersaoProvedorErro } from '../components/ErroForm'
import { useAtualizarErro } from '../hooks/useAtualizarErro'
import { useCriarErro } from '../hooks/useCriarErro'
import { useErrosAdmin } from '../hooks/useErrosAdmin'
import { useRemoverErro } from '../hooks/useRemoverErro'
import type { ErroAdminDetalhe, ErroAdminListaItem, ErroFormDto } from '../types/erroAdmin'

const TAMANHO_PAGINA_PADRAO = 25

/**
 * Opções de "provedores e versões aplicáveis" para o `ErroForm` — combina a
 * lista de provedores com as versões de cada um. Sem um endpoint único que já
 * devolva o par "provedor · versão", monta a partir de `useProvedoresAdmin`
 * (uma página grande) + `useVersoesProvedorAdmin` do primeiro provedor
 * expandido; nesta fatia, mantido simples: só o provedor do erro em edição
 * (quando houver) entra na combinação, evitando N+1 de rede a cada render.
 */
function useOpcoesVersoesProvedorErro(): OpcaoVersaoProvedorErro[] {
  const { data } = useProvedoresAdmin({ tamanhoPagina: 200 })
  const primeiroProvedor = data?.items[0]
  const { data: versoes } = useVersoesProvedorAdmin(primeiroProvedor?.id ?? 0)

  if (!primeiroProvedor || !versoes) return []

  return versoes.map((versao) => ({
    id: versao.id,
    rotulo: `${primeiroProvedor.nome} · ${versao.rotulo}`,
  }))
}

export function ErrosPage() {
  const permissoes = usePermissoesInterno()
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)

  const { data, isLoading, isError, refetch } = useErrosAdmin({ pagina, tamanhoPagina })
  const opcoesVersoes = useOpcoesVersoesProvedorErro()

  const publicarErro = usePublicarErro()
  const criarErro = useCriarErro()
  const atualizarErro = useAtualizarErro()
  const removerErro = useRemoverErro()

  const [modalAberto, setModalAberto] = useState<'novo' | ErroAdminDetalhe | null>(null)
  const [erroServidor, setErroServidor] = useState<string | null>(null)
  const [erroParaRemover, setErroParaRemover] = useState<ErroAdminListaItem | null>(null)
  const [erroDeRemocao, setErroDeRemocao] = useState<string | null>(null)

  function aoSalvar(dto: ErroFormDto) {
    setErroServidor(null)

    if (modalAberto === 'novo') {
      criarErro.mutate(dto, {
        onSuccess: () => setModalAberto(null),
        onError: (erro) => setErroServidor(handleApiError(erro)),
      })
      return
    }

    if (modalAberto) {
      atualizarErro.mutate(
        { id: modalAberto.id, dto, etag: modalAberto.etag },
        {
          onSuccess: () => setModalAberto(null),
          onError: (erro) => setErroServidor(handleApiError(erro)),
        },
      )
    }
  }

  /** A mutation só dispara depois da confirmação — nunca do clique na lista. */
  function confirmarRemocao() {
    if (!erroParaRemover) return

    setErroDeRemocao(null)
    removerErro.mutate(
      { id: erroParaRemover.id, etag: erroParaRemover.etag },
      {
        onSuccess: () => setErroParaRemover(null),
        onError: (falha) => setErroDeRemocao(handleApiError(falha)),
      },
    )
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
          <TableRoot>
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
                          onClick={() => setModalAberto(erro)}
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
                          onClick={() =>
                            publicarErro.mutate({
                              id: erro.id,
                              publicado: !erro.publicado,
                              etag: erro.etag,
                            })
                          }
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
        <ErroForm
          initialData={modalAberto === 'novo' ? undefined : (modalAberto ?? undefined)}
          opcoesVersoesProvedor={opcoesVersoes}
          opcoesCamposLayout={[]}
          onSubmit={aoSalvar}
          onCancel={() => setModalAberto(null)}
          isSubmitting={criarErro.isPending || atualizarErro.isPending}
          erroServidor={erroServidor}
        />
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
