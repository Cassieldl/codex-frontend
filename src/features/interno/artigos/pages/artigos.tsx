import { format, parseISO } from 'date-fns'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { Modal } from '../../../../components/ui/Modal'
import { Pagination } from '../../../../components/ui/Pagination'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { EtiquetaTipoArtigo } from '../../../artigos/components/EtiquetaTipoArtigo'
import { SLUG_COMO_FUNCIONA } from '../../../artigos/utils/slugsReservados'
import { useCamposLayoutPorVersao } from '../../camposLayout/hooks/useCamposLayoutPorVersao'
import { useVersoesLayout } from '../../camposLayout/hooks/useVersoesLayout'
import { useErrosAdmin } from '../../erros/hooks/useErrosAdmin'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { ArtigoForm, type OpcaoReferenciaArtigo } from '../components/ArtigoForm'
import { useArtigoAdminPorId } from '../hooks/useArtigoAdminPorId'
import { useArtigoExiste } from '../hooks/useArtigoExiste'
import { useArtigosAdmin } from '../hooks/useArtigosAdmin'
import { useAtualizarArtigo } from '../hooks/useAtualizarArtigo'
import { useCriarArtigo } from '../hooks/useCriarArtigo'
import { usePublicarArtigo } from '../hooks/usePublicarArtigo'
import { useRemoverArtigo } from '../hooks/useRemoverArtigo'
import { useVerificarArtigo } from '../hooks/useVerificarArtigo'
import type { ArtigoAdminListaItem, ArtigoFormDto } from '../types/artigoAdmin'
import {
  interpretarErroDeEscritaArtigo,
  type ErroDeEscritaArtigo,
} from '../utils/erroDeEscritaArtigo'

const TAMANHO_PAGINA_PADRAO = 25

/** Título que produz o slug reservado no servidor — a UI sugere, nunca força o slug. */
const TITULO_COMO_FUNCIONA = 'Como funciona'

const MOTIVO_ARTIGO_RESERVADO = 'Artigo obrigatório — não pode ser removido nem despublicado'

type ModalArtigo =
  { modo: 'novo' } | { modo: 'novo-como-funciona' } | { modo: 'editar'; id: number }

interface ErroDeEscritaNaTela {
  info: ErroDeEscritaArtigo
  /** Artigo afetado — `null` na criação, que ainda não tem id. */
  artigoId: number | null
}

/**
 * Opções de referência cruzada do `ArtigoForm`. Erros vêm de uma página
 * grande da listagem interna; campos do layout são sempre listados **por
 * versão de layout** (I16), então esta fatia usa a versão mais recente — que
 * é a que o editor tem em mente ao escrever. Versões antigas ficam de fora, e
 * o dia em que isso incomodar pede um seletor de versão no formulário, não um
 * N+1 de rede aqui.
 */
function useOpcoesDeReferencia(): {
  campos: OpcaoReferenciaArtigo[]
  erros: OpcaoReferenciaArtigo[]
} {
  const { data: versoesLayout } = useVersoesLayout({ tamanhoPagina: 200 })
  const versaoMaisRecente = versoesLayout?.items[0]
  const { data: campos } = useCamposLayoutPorVersao(versaoMaisRecente?.id ?? 0)
  const { data: erros } = useErrosAdmin({ tamanhoPagina: 200 })

  return {
    campos: (campos ?? []).map((campo) => ({ id: campo.id, rotulo: campo.nome })),
    erros: (erros?.items ?? []).map((erro) => ({
      id: erro.id,
      rotulo: `${erro.codigo} — ${erro.titulo}`,
    })),
  }
}

function formatarVerificacao(iso: string | null): string {
  if (!iso) return '—'
  const data = parseISO(iso)
  if (!Number.isFinite(data.getTime())) return '—'
  return format(data, 'dd/MM/yyyy')
}

function dataDeHoje(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function ArtigosPage() {
  const permissoes = usePermissoesInterno()

  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)
  const [modalAberto, setModalAberto] = useState<ModalArtigo | null>(null)
  const [erroDeEscrita, setErroDeEscrita] = useState<ErroDeEscritaNaTela | null>(null)

  const { data, isLoading, isError, refetch } = useArtigosAdmin({ pagina, tamanhoPagina })

  // I36, nunca varredura da listagem: a página só mostra 25 itens, e procurar
  // o slug reservado entre eles mentiria em silêncio assim que o acervo
  // crescesse (falso "ainda não existe").
  const existeComoFunciona = useArtigoExiste(SLUG_COMO_FUNCIONA)

  const idEmEdicao = modalAberto?.modo === 'editar' ? modalAberto.id : null
  const detalheEmEdicao = useArtigoAdminPorId(idEmEdicao)

  const opcoes = useOpcoesDeReferencia()

  const criarArtigo = useCriarArtigo()
  const atualizarArtigo = useAtualizarArtigo()
  const removerArtigo = useRemoverArtigo()
  const publicarArtigo = usePublicarArtigo()
  const verificarArtigo = useVerificarArtigo()

  function registrarErro(erro: unknown, artigoId: number | null) {
    setErroDeEscrita({ info: interpretarErroDeEscritaArtigo(erro), artigoId })
  }

  function aoSalvar(dto: ArtigoFormDto) {
    setErroDeEscrita(null)

    if (modalAberto?.modo === 'editar') {
      const { id } = modalAberto
      atualizarArtigo.mutate(
        { id, dto, etag: detalheEmEdicao.data?.etag },
        {
          onSuccess: () => setModalAberto(null),
          // 409 nunca reseta o modal: o formulário segue aberto com o que foi
          // digitado, e a recuperação é oferecida na faixa de erro.
          onError: (erro) => registrarErro(erro, id),
        },
      )
      return
    }

    criarArtigo.mutate(dto, {
      onSuccess: () => setModalAberto(null),
      onError: (erro) => registrarErro(erro, null),
    })
  }

  function aoAlternarPublicacao(artigo: ArtigoAdminListaItem) {
    setErroDeEscrita(null)
    publicarArtigo.mutate(
      { id: artigo.id, publicado: !artigo.publicado, etag: artigo.etag },
      { onError: (erro) => registrarErro(erro, artigo.id) },
    )
  }

  function aoRemover(artigo: ArtigoAdminListaItem) {
    setErroDeEscrita(null)
    removerArtigo.mutate(
      { id: artigo.id, etag: artigo.etag },
      { onError: (erro) => registrarErro(erro, artigo.id) },
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
   * validador de versão). `ARTIGO_RESERVADO` não tem ação — nenhum gesto faz
   * a remoção passar, e o botão já nasce desabilitado.
   */
  function aoRecuperar() {
    if (!erroDeEscrita) return

    if (erroDeEscrita.info.acao === 'recarregar-registro') {
      detalheEmEdicao.refetch()
    }
    if (erroDeEscrita.info.acao === 'recarregar-lista') {
      setModalAberto(null)
      refetch()
    }

    setErroDeEscrita(null)
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
            Conteúdo editorial do portal — conceitos, procedimentos e mudanças de layout.
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
          próprio na página — dentro do modal ele vai para o formulário. */}
      {erroDeEscrita && !erroNoModal && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-error bg-alert-error p-4"
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

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando artigos…</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState message="Nenhum artigo cadastrado ainda." />
      )}

      {!isLoading && !isError && temArtigos && data && (
        <>
          <TableRoot>
            <TableHeader>
              <tr>
                <TableCell header>Título</TableCell>
                <TableCell header>Tipo</TableCell>
                <TableCell header>Verificado em</TableCell>
                <TableCell header>Publicação</TableCell>
                <TableCell header>Ações</TableCell>
              </tr>
            </TableHeader>
            <tbody>
              {data.items.map((artigo) => (
                <TableRow key={artigo.id}>
                  <TableCell>{artigo.titulo}</TableCell>
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
                  <TableCell>
                    <div className="flex gap-2">
                      {permissoes.artigos.atualizar && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Editar artigo ${artigo.titulo}`}
                            onClick={() => {
                              setErroDeEscrita(null)
                              setModalAberto({ modo: 'editar', id: artigo.id })
                            }}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Marcar artigo ${artigo.titulo} como verificado hoje`}
                            isLoading={
                              verificarArtigo.isPending &&
                              verificarArtigo.variables?.id === artigo.id
                            }
                            onClick={() => aoVerificar(artigo)}
                          >
                            <ShieldCheck className="size-4" aria-hidden="true" />
                          </Button>
                        </>
                      )}
                      {permissoes.artigos.publicar && (
                        <Button
                          variant="secondary"
                          size="sm"
                          // Publicar é sempre permitido, inclusive o reservado
                          // (publicar nunca quebra link). Despublicar é que
                          // derrubaria /como-funciona — I28 responde 422, e a
                          // UI evita a viagem em vez de deixar o editor
                          // descobrir por um toast de erro.
                          disabled={artigo.reservado && artigo.publicado}
                          title={
                            artigo.reservado && artigo.publicado
                              ? MOTIVO_ARTIGO_RESERVADO
                              : undefined
                          }
                          isLoading={
                            publicarArtigo.isPending && publicarArtigo.variables?.id === artigo.id
                          }
                          onClick={() => aoAlternarPublicacao(artigo)}
                        >
                          {artigo.publicado ? 'Despublicar' : 'Publicar'}
                        </Button>
                      )}
                      {permissoes.artigos.remover && (
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Remover artigo ${artigo.titulo}`}
                          disabled={artigo.reservado}
                          title={artigo.reservado ? MOTIVO_ARTIGO_RESERVADO : undefined}
                          onClick={() => aoRemover(artigo)}
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
              opcoesCamposLayout={opcoes.campos}
              opcoesErros={opcoes.erros}
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
    </div>
  )
}
