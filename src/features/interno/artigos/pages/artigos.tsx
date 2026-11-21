import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
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
import { ROTULO_TIPO_ARTIGO } from '../../../artigos/components/rotulosTipoArtigo'
import { EtiquetaTipoArtigo } from '../../../artigos/components/EtiquetaTipoArtigo'
import { TIPOS_ARTIGO } from '../../../artigos/types/artigo'
import { SLUG_COMO_FUNCIONA } from '../../../artigos/utils/slugsReservados'
import { useDebounce } from '../../../busca/hooks/useDebounce'
import { BarraDeFiltrosDaListagem } from '../../components/BarraDeFiltrosDaListagem'
import { usePaginaPorFiltros } from '../../hooks/usePaginaPorFiltros'
import { useFocoNaLinhaAposTroca } from '../../hooks/useFocoNaLinhaAposTroca'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { ArtigoForm } from '../components/ArtigoForm'
import { useArtigoAdminPorId } from '../hooks/useArtigoAdminPorId'
import { useArtigoExiste } from '../hooks/useArtigoExiste'
import { useArtigosAdmin } from '../hooks/useArtigosAdmin'
import { useAtualizarArtigo } from '../hooks/useAtualizarArtigo'
import { useCriarArtigo } from '../hooks/useCriarArtigo'
import { useReferenciasDoArtigo } from '../hooks/useReferenciasDoArtigo'
import { usePublicarArtigo } from '../hooks/usePublicarArtigo'
import { useRemoverArtigo } from '../hooks/useRemoverArtigo'
import { useVerificarArtigo } from '../hooks/useVerificarArtigo'
import type {
  ArtigoAdminListaItem,
  ArtigoFormDto,
  CampoDeOrdenacaoArtigo,
  TipoArtigo,
} from '../types/artigoAdmin'
import {
  interpretarErroDeEscritaArtigo,
  type ErroDeEscritaArtigo,
} from '../utils/erroDeEscritaArtigo'
import type { OrigemDaEscrita } from '../../utils/mensagemDeErroDeEscrita'
import { useEtagDeEnvio } from '../../utils/useEtagDeEnvio'
import {
  CLASSE_DAS_ACOES_DA_LINHA,
  CLASSE_DO_NOME_EDITAVEL,
} from '../../utils/classesDaTabelaInterna'
import { publicadoDoFiltro, type FiltroDePublicacao } from '../../utils/filtroDePublicacao'

const TAMANHO_PAGINA_PADRAO = 25

/** Espera depois da última tecla antes de buscar: uma requisição por termo, não por letra. */
const ATRASO_DA_BUSCA_MS = 300

const OPCOES_DE_TIPO = [
  { value: '', label: 'Todos' },
  ...TIPOS_ARTIGO.map((tipo) => ({ value: tipo, label: ROTULO_TIPO_ARTIGO[tipo] })),
]

/** Título que produz o slug reservado no servidor: a UI sugere, nunca força o slug. */
const TITULO_COMO_FUNCIONA = 'Como funciona'

const MOTIVO_ARTIGO_RESERVADO = 'Artigo obrigatório: não pode ser removido nem despublicado'

type ModalArtigo =
  { modo: 'novo' } | { modo: 'novo-como-funciona' } | { modo: 'editar'; id: number }

interface ErroDeEscritaNaTela {
  info: ErroDeEscritaArtigo
  /** Artigo afetado; `null` na criação, que ainda não tem id. */
  artigoId: number | null
}

/** Identifica o formulário aberto, para a busca de referências recomeçar a cada artigo. */
function chaveDoModal(modal: ModalArtigo | null): string | null {
  if (modal === null) return null
  return modal.modo === 'editar' ? `editar-${modal.id}` : modal.modo
}

function formatarVerificacao(iso: string | null): string {
  if (!iso) return '-'
  const data = parseISO(iso)
  if (!Number.isFinite(data.getTime())) return '-'
  return format(data, 'dd/MM/yyyy')
}

function dataDeHoje(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function ArtigosPage() {
  const permissoes = usePermissoesInterno()

  const [termo, setTermo] = useState('')
  const termoComAtraso = useDebounce(termo.trim(), ATRASO_DA_BUSCA_MS)
  const [tipo, setTipo] = useState<TipoArtigo | null>(null)
  const [publicacao, setPublicacao] = useState<FiltroDePublicacao>('todos')
  const [ordenacao, setOrdenacao] = useState<OrdenacaoDeTabela<CampoDeOrdenacaoArtigo> | null>(null)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)
  const [modalAberto, setModalAberto] = useState<ModalArtigo | null>(null)
  const [artigoParaRemover, setArtigoParaRemover] = useState<ArtigoAdminListaItem | null>(null)
  const [erroDeEscrita, setErroDeEscrita] = useState<ErroDeEscritaNaTela | null>(null)

  const filtros = {
    q: termoComAtraso || undefined,
    tipo: tipo ?? undefined,
    publicado: publicadoDoFiltro(publicacao),
    sortBy: ordenacao?.sortBy,
    sortDirection: ordenacao?.sortDirection,
  }
  const [pagina, setPagina] = usePaginaPorFiltros(JSON.stringify(filtros))
  const temFiltro = Boolean(filtros.q || filtros.tipo || filtros.publicado !== undefined)

  const { data, isLoading, isError, isPlaceholderData, refetch } = useArtigosAdmin({
    ...filtros,
    pagina,
    tamanhoPagina,
  })
  const devolverFocoNaLinha = useFocoNaLinhaAposTroca(data)

  // I36, nunca varredura da listagem: a página só mostra 25 itens, e procurar
  // o slug reservado entre eles mentiria em silêncio assim que o acervo
  // crescesse (falso "ainda não existe").
  const existeComoFunciona = useArtigoExiste(SLUG_COMO_FUNCIONA)

  const idEmEdicao = modalAberto?.modo === 'editar' ? modalAberto.id : null
  const detalheEmEdicao = useArtigoAdminPorId(idEmEdicao)
  const envioDaEdicao = useEtagDeEnvio(idEmEdicao, detalheEmEdicao.data?.etag)

  const referencias = useReferenciasDoArtigo(chaveDoModal(modalAberto))

  const criarArtigo = useCriarArtigo()
  const atualizarArtigo = useAtualizarArtigo()
  const removerArtigo = useRemoverArtigo()
  const publicarArtigo = usePublicarArtigo()
  const verificarArtigo = useVerificarArtigo()

  function registrarErro(erro: unknown, artigoId: number | null, origem: OrigemDaEscrita = 'acao') {
    setErroDeEscrita({ info: interpretarErroDeEscritaArtigo(erro, origem), artigoId })
  }

  function aoSalvar(dto: ArtigoFormDto) {
    setErroDeEscrita(null)

    if (modalAberto?.modo === 'editar') {
      const { id } = modalAberto
      atualizarArtigo.mutate(
        { id, dto, etag: envioDaEdicao.etag },
        {
          onSuccess: () => setModalAberto(null),
          // 409 nunca reseta o modal: o formulário segue aberto com o que foi
          // digitado, e a recuperação é oferecida na faixa de erro.
          onError: (erro) => {
            envioDaEdicao.registrarErro(erro)
            registrarErro(erro, id, 'formulario')
          },
        },
      )
      return
    }

    criarArtigo.mutate(dto, {
      onSuccess: () => setModalAberto(null),
      onError: (erro) => registrarErro(erro, null, 'formulario'),
    })
  }

  function aoAlternarPublicacao(artigo: ArtigoAdminListaItem) {
    setErroDeEscrita(null)
    publicarArtigo.mutate(
      { id: artigo.id, publicado: !artigo.publicado, etag: artigo.etag },
      {
        onSuccess: () => devolverFocoNaLinha(`linha-artigo-${artigo.id}`),
        onError: (erro) => registrarErro(erro, artigo.id),
      },
    )
  }

  /**
   * Remoção é irreversível pela interface: a mutation só dispara depois da confirmação, nunca do
   * clique na lista (contrato de `ModalConfirmacao`). O erro continua na faixa da tela, que tem a
   * ação de recuperação por código.
   */
  function confirmarRemocao() {
    if (!artigoParaRemover) return

    const { id, etag } = artigoParaRemover
    setErroDeEscrita(null)
    removerArtigo.mutate(
      { id, etag },
      {
        onSettled: () => setArtigoParaRemover(null),
        onError: (erro) => registrarErro(erro, id),
      },
    )
  }

  function aoVerificar(artigo: ArtigoAdminListaItem) {
    setErroDeEscrita(null)
    verificarArtigo.mutate(
      { id: artigo.id, verificadoEm: dataDeHoje(), etag: artigo.etag },
      { onError: (erro) => registrarErro(erro, artigo.id) },
    )
  }

  /**
   * `CONFLITO_CONCORRENCIA` recarrega só o registro (alguém salvou antes);
   * `IF_MATCH_OBRIGATORIO` recarrega a lista inteira (o item em mãos veio sem
   * validador de versão). `ARTIGO_RESERVADO` não tem ação: nenhum gesto faz
   * a remoção passar, e o botão já nasce desabilitado.
   */
  function aoRecuperar() {
    if (!erroDeEscrita) return

    if (erroDeEscrita.info.acao === 'recarregar-registro') {
      void detalheEmEdicao.refetch()
    }
    if (erroDeEscrita.info.acao === 'recarregar-lista') {
      setModalAberto(null)
      void refetch()
    }

    setErroDeEscrita(null)
  }

  function limparFiltros() {
    setTermo('')
    setTipo(null)
    setPublicacao('todos')
  }

  function ordenarPor(campo: CampoDeOrdenacaoArtigo) {
    setOrdenacao((atual) => alternarOrdenacao(atual, campo))
  }

  function abrirEdicao(id: number) {
    setErroDeEscrita(null)
    setModalAberto({ modo: 'editar', id })
  }

  const erroNoModal = modalAberto !== null && erroDeEscrita !== null
  const temArtigos = Boolean(data && data.items.length > 0)
  const faltaArtigoReservado = existeComoFunciona.isSuccess && !existeComoFunciona.data.existe

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-titulo font-bold text-ink">Artigos</h1>
          <p className="text-sm text-muted">
            Conteúdo editorial do portal: conceitos, procedimentos e mudanças de layout.
          </p>
        </div>
        {permissoes.artigos.adicionar && (
          <Button
            leftIcon={<Plus className="size-4" />}
            onClick={() => {
              setErroDeEscrita(null)
              setModalAberto({ modo: 'novo' })
            }}
          >
            Novo artigo
          </Button>
        )}
      </div>

      {faltaArtigoReservado && (
        <div
          role="status"
          className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-primary-light bg-surface-hover p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-ink">
            O artigo obrigatório <strong>“Como funciona”</strong> ainda não existe. A rota pública{' '}
            <code className="mx-0.5">/como-funciona</code> está no menu do portal, mas devolve 404
            até que ele seja criado.
          </p>
          {permissoes.artigos.adicionar && (
            <Button
              className="shrink-0"
              onClick={() => {
                setErroDeEscrita(null)
                setModalAberto({ modo: 'novo-como-funciona' })
              }}
            >
              Criar agora
            </Button>
          )}
        </div>
      )}

      {/* Fora do modal, o erro de publicar/remover/verificar precisa de lugar
          próprio na página; dentro do modal ele vai para o formulário. */}
      {erroDeEscrita && !erroNoModal && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-[var(--radius-aviso)] border border-alert-error-borda bg-alert-error p-4"
        >
          <p className="text-sm text-error-texto">{erroDeEscrita.info.mensagem}</p>
          {erroDeEscrita.info.orientacao && (
            <p className="text-xs text-muted">{erroDeEscrita.info.orientacao}</p>
          )}
          {erroDeEscrita.info.rotuloAcao && (
            <Button variant="secondary" size="sm" className="self-start" onClick={aoRecuperar}>
              {erroDeEscrita.info.rotuloAcao}
            </Button>
          )}
        </div>
      )}

      <BarraDeFiltrosDaListagem
        termo={termo}
        onTermoChange={setTermo}
        placeholderDaBusca="Ex.: cancelamento, ABRASF 2.04"
        publicacao={publicacao}
        onPublicacaoChange={setPublicacao}
      >
        <Select
          label="Tipo"
          options={OPCOES_DE_TIPO}
          value={tipo ?? ''}
          onValueChange={(valor) => setTipo(valor === '' ? null : (valor as TipoArtigo))}
          className="w-56"
        />
      </BarraDeFiltrosDaListagem>

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando artigos…</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          message={
            temFiltro
              ? 'Nenhum artigo encontrado com estes filtros.'
              : 'Nenhum artigo cadastrado ainda.'
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

      {!isLoading && !isError && temArtigos && data && (
        <>
          <TableRoot rotulo="Artigos" className={isPlaceholderData ? 'opacity-60' : undefined}>
            <TableHeader>
              <tr>
                <TableSortableHeader campo="titulo" ordenacao={ordenacao} onOrdenar={ordenarPor}>
                  Título
                </TableSortableHeader>
                <TableSortableHeader campo="tipo" ordenacao={ordenacao} onOrdenar={ordenarPor}>
                  Tipo
                </TableSortableHeader>
                <TableSortableHeader
                  campo="verificadoem"
                  ordenacao={ordenacao}
                  onOrdenar={ordenarPor}
                >
                  Verificado em
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
              {data.items.map((artigo) => {
                const podeDespublicar = permissoes.artigos.publicar && artigo.publicado
                const temMaisAcoes =
                  permissoes.artigos.atualizar || podeDespublicar || permissoes.artigos.remover
                const acaoDoMenuEmAndamento =
                  (verificarArtigo.isPending && verificarArtigo.variables?.id === artigo.id) ||
                  (artigo.publicado &&
                    publicarArtigo.isPending &&
                    publicarArtigo.variables?.id === artigo.id)

                return (
                  <TableRow key={artigo.id} id={`linha-artigo-${artigo.id}`}>
                    <TableCell>
                      {permissoes.artigos.atualizar ? (
                        <button
                          type="button"
                          className={CLASSE_DO_NOME_EDITAVEL}
                          onClick={() => abrirEdicao(artigo.id)}
                        >
                          {artigo.titulo}
                        </button>
                      ) : (
                        artigo.titulo
                      )}
                    </TableCell>
                    <TableCell>
                      <EtiquetaTipoArtigo tipo={artigo.tipo} />
                    </TableCell>
                    <TableCell>{formatarVerificacao(artigo.verificadoEm)}</TableCell>
                    <TableCell>
                      <EtiquetaPublicacao
                        publicadoProprio={artigo.publicado}
                        publicadoEfetivo={artigo.publicado}
                      />
                    </TableCell>
                    <TableCell alinhamento="direita">
                      <div className={CLASSE_DAS_ACOES_DA_LINHA}>
                        {permissoes.artigos.publicar && !artigo.publicado && (
                          <Button
                            variant="secondary"
                            size="sm"
                            isLoading={
                              publicarArtigo.isPending && publicarArtigo.variables?.id === artigo.id
                            }
                            onClick={() => aoAlternarPublicacao(artigo)}
                          >
                            Publicar
                          </Button>
                        )}
                        {temMaisAcoes && (
                          <MenuDeAcoes
                            rotulo={`Mais ações do artigo ${artigo.titulo}`}
                            isLoading={acaoDoMenuEmAndamento}
                          >
                            {permissoes.artigos.atualizar && (
                              <ItemDoMenuDeAcoes onSelecionar={() => aoVerificar(artigo)}>
                                Marcar como verificado hoje
                              </ItemDoMenuDeAcoes>
                            )}
                            {podeDespublicar && (
                              // Despublicar o reservado derrubaria /como-funciona (I28 responde
                              // 422): o item já nasce indisponível, com o motivo à vista.
                              <ItemDoMenuDeAcoes
                                motivoIndisponivel={
                                  artigo.reservado ? MOTIVO_ARTIGO_RESERVADO : undefined
                                }
                                onSelecionar={() => aoAlternarPublicacao(artigo)}
                              >
                                Despublicar
                              </ItemDoMenuDeAcoes>
                            )}
                            {permissoes.artigos.remover && (
                              <ItemDoMenuDeAcoes
                                destrutivo
                                aria-label={`Remover artigo ${artigo.titulo}`}
                                motivoIndisponivel={
                                  artigo.reservado ? MOTIVO_ARTIGO_RESERVADO : undefined
                                }
                                onSelecionar={() => setArtigoParaRemover(artigo)}
                              >
                                Remover
                              </ItemDoMenuDeAcoes>
                            )}
                          </MenuDeAcoes>
                        )}
                      </div>
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
        title={modalAberto?.modo === 'editar' ? 'Editar artigo' : 'Novo artigo'}
        size="lg"
      >
        {modalAberto?.modo === 'editar' && detalheEmEdicao.isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Carregando artigo…</span>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {modalAberto?.modo === 'editar' && detalheEmEdicao.isError && (
          <ErrorState onRetry={() => detalheEmEdicao.refetch()} />
        )}

        {modalAberto !== null && (modalAberto.modo !== 'editar' || detalheEmEdicao.isSuccess) && (
          <>
            <ArtigoForm
              // Remontar ao trocar de artigo: os defaults do RHF só são lidos
              // na montagem, e reaproveitar a instância manteria o formulário
              // anterior preenchido.
              key={modalAberto.modo === 'editar' ? modalAberto.id : modalAberto.modo}
              initialData={modalAberto.modo === 'editar' ? detalheEmEdicao.data : undefined}
              sugestao={
                modalAberto.modo === 'novo-como-funciona'
                  ? { titulo: TITULO_COMO_FUNCIONA, tipo: 'Conceito' }
                  : undefined
              }
              buscaDeErros={referencias.buscaDeErros}
              camposLayout={referencias.camposLayout}
              onSubmit={aoSalvar}
              onCancel={() => setModalAberto(null)}
              isSubmitting={criarArtigo.isPending || atualizarArtigo.isPending}
              erroServidor={erroNoModal ? erroDeEscrita.info.mensagem : null}
              errosDeCampo={erroNoModal ? erroDeEscrita.info.errosDeCampo : undefined}
            />

            {erroNoModal && erroDeEscrita.info.orientacao && (
              <p className="mt-2 text-xs text-muted">{erroDeEscrita.info.orientacao}</p>
            )}

            {erroNoModal && erroDeEscrita.info.rotuloAcao && (
              <Button variant="secondary" size="sm" className="mt-2" onClick={aoRecuperar}>
                {erroDeEscrita.info.rotuloAcao}
              </Button>
            )}
          </>
        )}
      </Modal>

      <ModalConfirmacao
        isOpen={artigoParaRemover !== null}
        title="Remover artigo"
        message={
          artigoParaRemover?.publicado
            ? `O artigo "${artigoParaRemover.titulo}" está publicado e sai do portal agora.`
            : `O artigo "${artigoParaRemover?.titulo}" é removido definitivamente.`
        }
        isConfirming={removerArtigo.isPending}
        onConfirm={confirmarRemocao}
        onCancel={() => setArtigoParaRemover(null)}
      />
    </div>
  )
}
