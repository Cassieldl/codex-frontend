import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { ItemDoMenuDeAcoes, MenuDeAcoes } from '../../../../components/ui/MenuDeAcoes'
import { Modal } from '../../../../components/ui/Modal'
import { ModalConfirmacao } from '../../../../components/ui/ModalConfirmacao'
import {
  alternarOrdenacao,
  type OrdenacaoDeTabela,
} from '../../../../components/ui/ordenacaoDeTabela'
import { Pagination } from '../../../../components/ui/Pagination'
import { Select } from '../../../../components/ui/Select'
import { Skeleton } from '../../../../components/ui/Skeleton'
import {
  TableCell,
  TableHeader,
  TableRoot,
  TableRow,
  TableSortableHeader,
} from '../../../../components/ui/Table'
import { useDebounce } from '../../../busca/hooks/useDebounce'
import { BarraDeFiltrosDaListagem } from '../../components/BarraDeFiltrosDaListagem'
import { usePaginaPorFiltros } from '../../hooks/usePaginaPorFiltros'
import { useFocoNaLinhaAposTroca } from '../../hooks/useFocoNaLinhaAposTroca'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarErro } from '../../hooks/usePublicarErro'
import {
  CLASSE_DAS_ACOES_DA_LINHA,
  CLASSE_DO_NOME_EDITAVEL,
} from '../../utils/classesDaTabelaInterna'
import { etagNaColecao } from '../../utils/etagDeConcorrencia'
import { publicadoDoFiltro, type FiltroDePublicacao } from '../../utils/filtroDePublicacao'
import { useEtagDeEnvio } from '../../utils/useEtagDeEnvio'
import { ErroForm } from '../components/ErroForm'
import { useAtualizarErro } from '../hooks/useAtualizarErro'
import { useCriarErro } from '../hooks/useCriarErro'
import { useErroAdminPorId } from '../hooks/useErroAdminPorId'
import { useErrosAdmin } from '../hooks/useErrosAdmin'
import { useOpcoesVersoesProvedorErro } from '../hooks/useOpcoesVersoesProvedorErro'
import { useRemoverErro } from '../hooks/useRemoverErro'
import {
  ORIGENS_ERRO,
  type AtualizarErroDto,
  type CampoDeOrdenacaoErro,
  type ErroAdminListaItem,
  type ErroFormDto,
  type OrigemErro,
} from '../types/erroAdmin'
import { mensagemDeErroDeEscrita } from '../../utils/mensagemDeErroDeEscrita'

const TAMANHO_PAGINA_PADRAO = 25

/** Espera depois da última tecla antes de buscar: uma requisição por termo, não por letra. */
const ATRASO_DA_BUSCA_MS = 300

const OPCOES_DE_ORIGEM = [
  { value: '', label: 'Todas' },
  ...ORIGENS_ERRO.map((origem) => ({ value: origem, label: origem })),
]

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
  const [termo, setTermo] = useState('')
  const termoComAtraso = useDebounce(termo.trim(), ATRASO_DA_BUSCA_MS)
  const [origem, setOrigem] = useState<OrigemErro | null>(null)
  const [publicacao, setPublicacao] = useState<FiltroDePublicacao>('todos')
  const [ordenacao, setOrdenacao] = useState<OrdenacaoDeTabela<CampoDeOrdenacaoErro> | null>(null)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)

  const filtros = {
    q: termoComAtraso || undefined,
    origem: origem ?? undefined,
    publicado: publicadoDoFiltro(publicacao),
    sortBy: ordenacao?.sortBy,
    sortDirection: ordenacao?.sortDirection,
  }
  const [pagina, setPagina] = usePaginaPorFiltros(JSON.stringify(filtros))
  const temFiltro = Boolean(filtros.q || filtros.origem || filtros.publicado !== undefined)

  const { data, isLoading, isError, isPlaceholderData, refetch } = useErrosAdmin({
    ...filtros,
    pagina,
    tamanhoPagina,
  })
  const devolverFocoNaLinha = useFocoNaLinhaAposTroca(data)

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

  /** A mutation só dispara depois da confirmação - nunca do clique na lista. */
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
        onSuccess: () => devolverFocoNaLinha(`linha-erro-${erro.id}`),
        onError: (falha) =>
          setErroDePublicacao({
            erroId: erro.id,
            mensagem: mensagemDeErroDeEscrita(falha, 'acao'),
          }),
      },
    )
  }

  function limparFiltros() {
    setTermo('')
    setOrigem(null)
    setPublicacao('todos')
  }

  function ordenarPor(campo: CampoDeOrdenacaoErro) {
    setOrdenacao((atual) => alternarOrdenacao(atual, campo))
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

      <BarraDeFiltrosDaListagem
        termo={termo}
        onTermoChange={setTermo}
        placeholderDaBusca="Ex.: E0621, alíquota"
        publicacao={publicacao}
        onPublicacaoChange={setPublicacao}
      >
        <Select
          label="Origem"
          options={OPCOES_DE_ORIGEM}
          value={origem ?? ''}
          onValueChange={(valor) => setOrigem(valor === '' ? null : (valor as OrigemErro))}
          className="w-44"
        />
      </BarraDeFiltrosDaListagem>

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando erros…</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          message={
            temFiltro
              ? 'Nenhum erro encontrado com estes filtros.'
              : 'Nenhum erro cadastrado ainda.'
          }
          action={
            temFiltro && (
              <Button variant="secondary" size="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            )
          }
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <TableRoot
            rotulo="Erros conhecidos"
            className={isPlaceholderData ? 'opacity-60' : undefined}
          >
            <TableHeader>
              <tr>
                <TableSortableHeader campo="codigo" ordenacao={ordenacao} onOrdenar={ordenarPor}>
                  Código
                </TableSortableHeader>
                <TableSortableHeader campo="titulo" ordenacao={ordenacao} onOrdenar={ordenarPor}>
                  Título
                </TableSortableHeader>
                <TableSortableHeader campo="origem" ordenacao={ordenacao} onOrdenar={ordenarPor}>
                  Origem
                </TableSortableHeader>
                <TableSortableHeader campo="publicado" ordenacao={ordenacao} onOrdenar={ordenarPor}>
                  Publicação
                </TableSortableHeader>
                <TableCell header alinhamento="direita">
                  Ações
                </TableCell>
              </tr>
            </TableHeader>
            <tbody>
              {data.items.map((erro) => {
                const podeDespublicar = permissoes.erros.publicar && erro.publicado
                const temMaisAcoes = podeDespublicar || permissoes.erros.remover

                return (
                  <TableRow key={erro.id} id={`linha-erro-${erro.id}`}>
                    <TableCell className="font-mono">{erro.codigo}</TableCell>
                    <TableCell>
                      {permissoes.erros.atualizar ? (
                        <button
                          type="button"
                          className={CLASSE_DO_NOME_EDITAVEL}
                          onClick={() => setModalAberto(erro.id)}
                        >
                          {erro.titulo}
                        </button>
                      ) : (
                        erro.titulo
                      )}
                    </TableCell>
                    <TableCell>{erro.origem}</TableCell>
                    <TableCell>
                      <EtiquetaPublicacao
                        publicadoProprio={erro.publicado}
                        publicadoEfetivo={erro.publicado}
                      />
                    </TableCell>
                    <TableCell alinhamento="direita">
                      <div className={CLASSE_DAS_ACOES_DA_LINHA}>
                        {permissoes.erros.publicar && !erro.publicado && (
                          <Button
                            variant="secondary"
                            size="sm"
                            isLoading={
                              publicarErro.isPending && publicarErro.variables?.id === erro.id
                            }
                            onClick={() => alternarPublicacao(erro)}
                          >
                            Publicar
                          </Button>
                        )}
                        {temMaisAcoes && (
                          <MenuDeAcoes
                            rotulo={`Mais ações do erro ${erro.codigo}`}
                            isLoading={
                              erro.publicado &&
                              publicarErro.isPending &&
                              publicarErro.variables?.id === erro.id
                            }
                          >
                            {podeDespublicar && (
                              <ItemDoMenuDeAcoes onSelecionar={() => alternarPublicacao(erro)}>
                                Despublicar
                              </ItemDoMenuDeAcoes>
                            )}
                            {permissoes.erros.remover && (
                              <ItemDoMenuDeAcoes
                                destrutivo
                                aria-label={`Remover erro ${erro.codigo}`}
                                onSelecionar={() => setErroParaRemover(erro)}
                              >
                                Remover
                              </ItemDoMenuDeAcoes>
                            )}
                          </MenuDeAcoes>
                        )}
                      </div>
                      {erroDePublicacao?.erroId === erro.id && (
                        <p role="alert" className="mt-1 text-sm text-error-texto">
                          {erroDePublicacao.mensagem}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
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
