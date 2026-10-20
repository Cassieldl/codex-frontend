import { format } from 'date-fns'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { EtiquetaSeveridade, type Severidade } from '../../../../components/ui/EtiquetaSeveridade'
import { Modal } from '../../../../components/ui/Modal'
import { ModalConfirmacao } from '../../../../components/ui/ModalConfirmacao'
import { Pagination } from '../../../../components/ui/Pagination'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { useProvedoresAdmin } from '../../provedores/hooks/useProvedoresAdmin'
import { ComunicadoForm, type OpcaoProvedorComunicado } from '../components/ComunicadoForm'
import { EstadoComunicado } from '../components/EstadoComunicado'
import { useAtualizarComunicado } from '../hooks/useAtualizarComunicado'
import { useComunicadoAdminPorId } from '../hooks/useComunicadoAdminPorId'
import { useComunicadosAdmin } from '../hooks/useComunicadosAdmin'
import { useCriarComunicado } from '../hooks/useCriarComunicado'
import { usePublicarComunicado } from '../hooks/usePublicarComunicado'
import { useRemoverComunicado } from '../hooks/useRemoverComunicado'
import type {
  ComunicadoAdminListaItem,
  ComunicadoFormDto,
  SeveridadeComunicado,
} from '../types/comunicadoAdmin'
import {
  interpretarErroDeEscritaComunicado,
  type ErroDeEscritaComunicado,
} from '../utils/erroDeEscritaComunicado'
import type { OrigemDaEscrita } from '../../utils/mensagemDeErroDeEscrita'
import { useEtagDeEnvio } from '../../utils/useEtagDeEnvio'

const TAMANHO_PAGINA_PADRAO = 25

/** Valor de contrato (ASCII) → variante visual da etiqueta compartilhada. */
const SEVERIDADE_VISUAL: Record<SeveridadeComunicado, Severidade> = {
  Critico: 'critico',
  Alerta: 'alerta',
  Informativo: 'informativo',
}

/** Modal aberto: criação, ou edição de um comunicado identificado por id. */
type ModalComunicado = { modo: 'novo' } | { modo: 'editar'; id: number }

interface ErroDeEscritaNaTela {
  info: ErroDeEscritaComunicado
  /** Comunicado afetado — `null` na criação, que ainda não tem id. */
  comunicadoId: number | null
}

function descreverAbrangencia(comunicado: ComunicadoAdminListaItem): string {
  if (comunicado.abrangencia === 'Global') return 'Todo o portal'
  if (!comunicado.provedorNome) return 'Escopo não informado'
  if (comunicado.versaoRotulo) return `${comunicado.provedorNome} · ${comunicado.versaoRotulo}`
  return comunicado.provedorNome
}

function formatarExpiracao(iso: string): string {
  const data = new Date(iso)
  if (!Number.isFinite(data.getTime())) return '—'
  return format(data, "dd/MM/yyyy 'às' HH:mm")
}

export function ComunicadosPage() {
  const permissoes = usePermissoesInterno()
  const idFiltroEncerrados = useId()

  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)
  // Default desmarcado: o backend esconde só o que ENCERROU (expiraEm no
  // passado). Rascunho vigente continua na visão padrão — é conteúdo em
  // preparação, não histórico.
  const [incluirEncerrados, setIncluirEncerrados] = useState(false)

  const [modalAberto, setModalAberto] = useState<ModalComunicado | null>(null)
  const [comunicadoParaRemover, setComunicadoParaRemover] =
    useState<ComunicadoAdminListaItem | null>(null)
  const [erroDeEscrita, setErroDeEscrita] = useState<ErroDeEscritaNaTela | null>(null)

  const { data, isLoading, isError, refetch } = useComunicadosAdmin({
    incluirEncerrados,
    pagina,
    tamanhoPagina,
  })

  const idEmEdicao = modalAberto?.modo === 'editar' ? modalAberto.id : null
  const detalheEmEdicao = useComunicadoAdminPorId(idEmEdicao)
  const envioDaEdicao = useEtagDeEnvio(idEmEdicao, detalheEmEdicao.data?.etag)

  const { data: provedores } = useProvedoresAdmin({ tamanhoPagina: 200 })
  const opcoesProvedores: OpcaoProvedorComunicado[] = (provedores?.items ?? []).map((provedor) => ({
    id: provedor.id,
    nome: provedor.nome,
  }))

  const criarComunicado = useCriarComunicado()
  const atualizarComunicado = useAtualizarComunicado()
  const removerComunicado = useRemoverComunicado()
  const publicarComunicado = usePublicarComunicado()

  function registrarErro(
    erro: unknown,
    comunicadoId: number | null,
    origem: OrigemDaEscrita = 'acao',
  ) {
    setErroDeEscrita({ info: interpretarErroDeEscritaComunicado(erro, origem), comunicadoId })
  }

  function aoSalvar(dto: ComunicadoFormDto) {
    setErroDeEscrita(null)

    if (modalAberto?.modo === 'novo') {
      criarComunicado.mutate(dto, {
        onSuccess: () => setModalAberto(null),
        onError: (erro) => registrarErro(erro, null, 'formulario'),
      })
      return
    }

    if (modalAberto?.modo === 'editar') {
      const { id } = modalAberto
      atualizarComunicado.mutate(
        { id, dto, etag: envioDaEdicao.etag },
        {
          onSuccess: () => setModalAberto(null),
          // 409 nunca reseta o modal: o formulário segue aberto com o que
          // foi digitado, e a recuperação é oferecida na faixa de erro.
          onError: (erro) => {
            envioDaEdicao.registrarErro(erro)
            registrarErro(erro, id, 'formulario')
          },
        },
      )
    }
  }

  function aoAlternarPublicacao(comunicado: ComunicadoAdminListaItem) {
    setErroDeEscrita(null)
    publicarComunicado.mutate(
      { id: comunicado.id, publicado: !comunicado.publicado, etag: comunicado.etag },
      { onError: (erro) => registrarErro(erro, comunicado.id) },
    )
  }

  /**
   * Remoção é irreversível pela interface e um comunicado publicado está no ar: a mutation só
   * dispara depois da confirmação, nunca do clique na lista (contrato de `ModalConfirmacao`).
   */
  function confirmarRemocao() {
    if (!comunicadoParaRemover) return

    const { id, etag } = comunicadoParaRemover
    setErroDeEscrita(null)
    removerComunicado.mutate(
      { id, etag },
      {
        // O erro fecha o diálogo de propósito: a faixa da tela é que sabe se o caso é
        // `CONFLITO_CONCORRENCIA`, `IF_MATCH_OBRIGATORIO` ou `COMUNICADO_EXPIRADO`, e cada um
        // tem sua ação de recuperação.
        onSettled: () => setComunicadoParaRemover(null),
        onError: (erro) => registrarErro(erro, id),
      },
    )
  }

  /**
   * Cada código de erro tem a própria saída. `CONFLITO_CONCORRENCIA` recarrega
   * só o registro (alguém salvou antes); `IF_MATCH_OBRIGATORIO` recarrega a
   * lista inteira (o item em mãos veio sem validador de versão);
   * `COMUNICADO_EXPIRADO` abre a edição, que é onde se estende a expiração.
   */
  function aoRecuperar() {
    if (!erroDeEscrita) return
    const { info, comunicadoId } = erroDeEscrita

    if (info.acao === 'recarregar-registro') {
      void detalheEmEdicao.refetch()
    }
    if (info.acao === 'recarregar-lista') {
      setModalAberto(null)
      void refetch()
    }
    if (info.acao === 'editar-expiracao' && comunicadoId !== null) {
      setModalAberto({ modo: 'editar', id: comunicadoId })
    }

    setErroDeEscrita(null)
  }

  const erroNoModal = modalAberto !== null && erroDeEscrita !== null
  const temComunicados = Boolean(data && data.items.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-titulo font-bold text-ink">Comunicados</h1>
          <p className="text-sm text-muted">
            Avisos temporários exibidos no portal até a data de expiração.
          </p>
        </div>
        {permissoes.comunicados.adicionar && (
          <Button
            leftIcon={<Plus className="size-4" />}
            onClick={() => {
              setErroDeEscrita(null)
              setModalAberto({ modo: 'novo' })
            }}
          >
            Novo comunicado
          </Button>
        )}
      </div>

      <label htmlFor={idFiltroEncerrados} className="flex items-center gap-2 text-sm text-ink">
        <input
          id={idFiltroEncerrados}
          type="checkbox"
          className="size-4 rounded-[var(--radius-check)]"
          checked={incluirEncerrados}
          onChange={(evento) => {
            setIncluirEncerrados(evento.target.checked)
            setPagina(1)
          }}
        />
        Mostrar também os comunicados já encerrados
      </label>

      {/* Fora do modal, o erro de publicar/remover precisa de lugar próprio na
          página — dentro do modal ele vai para o formulário. */}
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
          <span className="sr-only">Carregando comunicados…</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          message={
            incluirEncerrados
              ? 'Nenhum comunicado cadastrado ainda.'
              : 'Nenhum comunicado em vigência. Marque a opção acima para ver os já encerrados.'
          }
        />
      )}

      {!isLoading && !isError && temComunicados && data && (
        <>
          <TableRoot rotulo="Comunicados">
            <TableHeader>
              <tr>
                <TableCell header>Título</TableCell>
                <TableCell header>Severidade</TableCell>
                <TableCell header>Abrangência</TableCell>
                <TableCell header>Expira em</TableCell>
                <TableCell header>Estado</TableCell>
                <TableCell header>Ações</TableCell>
              </tr>
            </TableHeader>
            <tbody>
              {data.items.map((comunicado) => (
                <TableRow key={comunicado.id}>
                  <TableCell>{comunicado.titulo}</TableCell>
                  <TableCell>
                    <EtiquetaSeveridade severidade={SEVERIDADE_VISUAL[comunicado.severidade]} />
                  </TableCell>
                  <TableCell>{descreverAbrangencia(comunicado)}</TableCell>
                  <TableCell>{formatarExpiracao(comunicado.expiraEm)}</TableCell>
                  <TableCell>
                    <EstadoComunicado
                      publicado={comunicado.publicado}
                      encerrado={comunicado.encerrado}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {permissoes.comunicados.atualizar && (
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Editar comunicado ${comunicado.titulo}`}
                          onClick={() => {
                            setErroDeEscrita(null)
                            setModalAberto({ modo: 'editar', id: comunicado.id })
                          }}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                      {permissoes.comunicados.publicar && (
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={
                            publicarComunicado.isPending &&
                            publicarComunicado.variables?.id === comunicado.id
                          }
                          onClick={() => aoAlternarPublicacao(comunicado)}
                        >
                          {comunicado.publicado ? 'Despublicar' : 'Publicar'}
                        </Button>
                      )}
                      {permissoes.comunicados.remover && (
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Remover comunicado ${comunicado.titulo}`}
                          onClick={() => setComunicadoParaRemover(comunicado)}
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
        title={modalAberto?.modo === 'novo' ? 'Novo comunicado' : 'Editar comunicado'}
        size="md"
      >
        {modalAberto?.modo === 'editar' && detalheEmEdicao.isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Carregando comunicado…</span>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {modalAberto?.modo === 'editar' && detalheEmEdicao.isError && (
          <ErrorState onRetry={() => detalheEmEdicao.refetch()} />
        )}

        {modalAberto !== null && (modalAberto.modo === 'novo' || detalheEmEdicao.isSuccess) && (
          <>
            <ComunicadoForm
              // Remontar ao trocar de comunicado: os defaults do RHF só são
              // lidos na montagem, e reaproveitar a instância manteria o
              // formulário anterior preenchido.
              key={modalAberto.modo === 'novo' ? 'novo' : modalAberto.id}
              initialData={modalAberto.modo === 'editar' ? detalheEmEdicao.data : undefined}
              opcoesProvedores={opcoesProvedores}
              onSubmit={aoSalvar}
              onCancel={() => setModalAberto(null)}
              isSubmitting={criarComunicado.isPending || atualizarComunicado.isPending}
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
        isOpen={comunicadoParaRemover !== null}
        title="Remover comunicado"
        message={
          comunicadoParaRemover?.publicado
            ? `O comunicado "${comunicadoParaRemover.titulo}" está publicado e sai do portal agora.`
            : `O comunicado "${comunicadoParaRemover?.titulo}" é removido definitivamente.`
        }
        isConfirming={removerComunicado.isPending}
        onConfirm={confirmarRemocao}
        onCancel={() => setComunicadoParaRemover(null)}
      />
    </div>
  )
}
