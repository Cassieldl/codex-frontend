import { Link } from '@tanstack/react-router'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AbasNavegaveis, type AbaNavegavel } from '../../../../components/ui/AbasNavegaveis'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { EtiquetaEstado, type EstadoPreenchimento } from '../../../../components/ui/EtiquetaEstado'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Input } from '../../../../components/ui/Input'
import { Modal } from '../../../../components/ui/Modal'
import { ModalConfirmacao } from '../../../../components/ui/ModalConfirmacao'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { formatarDataCurta } from '../../../../utils/formatarDataVerificacao'
import { useCamposLayoutPorVersao } from '../../camposLayout/hooks/useCamposLayoutPorVersao'
import { SecaoExemplosVersao } from '../../exemplos/components/SecaoExemplosVersao'
import { useExemplosPorVersao } from '../../exemplos/hooks/useExemplosPorVersao'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarAviso } from '../../hooks/usePublicarAviso'
import { etagNaColecao } from '../../utils/etagDeConcorrencia'
import { useEtagDeEnvio } from '../../utils/useEtagDeEnvio'
import { usePublicarVersaoProvedor } from '../../hooks/usePublicarVersaoProvedor'
import { AvisoDaVersao } from '../components/AvisoDaVersao'
import { AvisoForm, type AvisoFormDto } from '../components/AvisoForm'
import { CampoVersaoForm } from '../components/CampoVersaoForm'
import { useAtualizarAviso } from '../hooks/useAtualizarAviso'
import { useAtualizarCampoVersao } from '../hooks/useAtualizarCampoVersao'
import { useCamposVersao } from '../hooks/useCamposVersao'
import { useCriarAvisoVersao } from '../hooks/useCriarAvisoVersao'
import { useCriarCampoVersao } from '../hooks/useCriarCampoVersao'
import { useProvedorAdminPorId } from '../hooks/useProvedorAdminPorId'
import { useRemoverAviso } from '../hooks/useRemoverAviso'
import { useRemoverCampoVersao } from '../hooks/useRemoverCampoVersao'
import { useVerificarVersao } from '../hooks/useVerificarVersao'
import { useVersaoAdminPorId } from '../hooks/useVersaoAdminPorId'
import { versoesAdminKeys } from '../hooks/versoesAdminKeys'
import { ABAS_DA_VERSAO, type AbaDaVersao } from '../types/abaDaVersao'
import type { AvisoAdmin } from '../types/avisoAdmin'
import type {
  AtualizarCampoVersaoDto,
  CampoVersaoAdmin,
  CriarCampoVersaoDto,
} from '../types/campoVersaoAdmin'
import { mensagemDeErroDeEscrita } from '../../utils/mensagemDeErroDeEscrita'
import { CLASSE_DAS_ACOES_DA_LINHA } from '../../utils/classesDaTabelaInterna'

/** Falha ao publicar ou despublicar um aviso, mostrada junto do aviso que a causou. */
interface ErroDePublicacaoDoAviso {
  avisoId: number
  mensagem: string
}

const ESTADO_PARA_TOKEN: Record<CampoVersaoAdmin['estadoPreenchimento'], EstadoPreenchimento> = {
  Obrigatorio: 'obrigatorio',
  Opcional: 'opcional',
  Condicional: 'condicional',
}

/** O campo canônico fica só leitura na edição e não vai no corpo: o backend não o aceita no PUT. */
function paraAtualizacao({
  campoLayoutId: _campoLayoutId,
  ...dto
}: CriarCampoVersaoDto): AtualizarCampoVersaoDto {
  return dto
}

const ROTULO_DA_ABA: Record<AbaDaVersao, string> = {
  avisos: 'Avisos',
  campos: 'Campos',
  exemplos: 'Exemplos',
  verificacao: 'Verificação',
}

export interface IdVersaoPageProps {
  provedorId: number
  versaoId: number
  /** Aba aberta, vinda do `?aba=` da rota. */
  aba: AbaDaVersao
}

export function IdVersaoPage({ provedorId, versaoId, aba }: IdVersaoPageProps) {
  const permissoes = usePermissoesInterno()

  const { data: provedor } = useProvedorAdminPorId(provedorId)
  const { data: versao, isLoading, isError, refetch } = useVersaoAdminPorId(versaoId)
  const { data: respostaCampos, isLoading: camposCarregando } = useCamposVersao(versaoId)
  const { data: camposLayout } = useCamposLayoutPorVersao(versao?.versaoLayoutId ?? 0)
  // Mesma chave da seção de exemplos: o contador da aba não gera requisição a mais.
  const { data: exemplos } = useExemplosPorVersao(versaoId, permissoes.exemplos.buscar)

  const publicarVersao = usePublicarVersaoProvedor()
  const verificarVersao = useVerificarVersao()
  const criarCampo = useCriarCampoVersao(versaoId)
  const atualizarCampo = useAtualizarCampoVersao()
  const removerCampo = useRemoverCampoVersao()
  const publicarAviso = usePublicarAviso(versoesAdminKeys.detail(versaoId))
  const criarAvisoVersao = useCriarAvisoVersao(versaoId)
  const atualizarAviso = useAtualizarAviso(versoesAdminKeys.detail(versaoId))
  const removerAviso = useRemoverAviso(versoesAdminKeys.detail(versaoId))

  const [modalCampoAberto, setModalCampoAberto] = useState<'novo' | CampoVersaoAdmin | null>(null)
  const [erroCampo, setErroCampo] = useState<string | null>(null)

  const [modalAvisoAberto, setModalAvisoAberto] = useState<'novo' | AvisoAdmin | null>(null)
  const [erroAviso, setErroAviso] = useState<string | null>(null)

  const [avisoParaRemover, setAvisoParaRemover] = useState<AvisoAdmin | null>(null)
  const [campoParaRemover, setCampoParaRemover] = useState<CampoVersaoAdmin | null>(null)
  const [erroRemocao, setErroRemocao] = useState<string | null>(null)
  const [erroDePublicacaoDoAviso, setErroDePublicacaoDoAviso] =
    useState<ErroDePublicacaoDoAviso | null>(null)

  const [erroDePublicacao, setErroDePublicacao] = useState<string | null>(null)

  const [dataVerificacao, setDataVerificacao] = useState('')
  const [erroDeVerificacao, setErroDeVerificacao] = useState<string | null>(null)

  const campoEmEdicao = typeof modalCampoAberto === 'object' ? modalCampoAberto : null
  const envioDoCampo = useEtagDeEnvio(
    campoEmEdicao?.id ?? null,
    etagNaColecao(respostaCampos?.campos, campoEmEdicao),
  )

  const envioDaRemocaoDoAviso = useEtagDeEnvio(
    avisoParaRemover?.id ?? null,
    etagNaColecao(versao?.avisos, avisoParaRemover),
  )

  const envioDaRemocaoDoCampo = useEtagDeEnvio(
    campoParaRemover?.id ?? null,
    etagNaColecao(respostaCampos?.campos, campoParaRemover),
  )

  const avisoEmEdicao = typeof modalAvisoAberto === 'object' ? modalAvisoAberto : null
  const envioDoAviso = useEtagDeEnvio(
    avisoEmEdicao?.id ?? null,
    etagNaColecao(versao?.avisos, avisoEmEdicao),
  )

  if (isLoading) {
    return (
      <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Carregando versão…</span>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError || !versao) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const publicadoEfetivo = versao.publicado && (provedor?.publicado ?? true)

  const contadorPorAba: Record<AbaDaVersao, number | undefined> = {
    avisos: versao.avisos.length,
    campos: respostaCampos?.campos.length,
    exemplos: exemplos?.length,
    verificacao: undefined,
  }

  const abas: AbaNavegavel[] = ABAS_DA_VERSAO.map((valor) => ({
    rotulo: ROTULO_DA_ABA[valor],
    contador: contadorPorAba[valor],
    to: '/interno/provedores/$provedorId/versoes/$versaoId',
    params: { provedorId: String(provedorId), versaoId: String(versaoId) },
    search: { aba: valor },
    ativa: valor === aba,
  }))

  function aoSalvarCampo(dto: CriarCampoVersaoDto) {
    setErroCampo(null)

    if (modalCampoAberto === 'novo') {
      criarCampo.mutate(dto, {
        onSuccess: () => setModalCampoAberto(null),
        onError: (erro) => setErroCampo(mensagemDeErroDeEscrita(erro)),
      })
      return
    }

    if (modalCampoAberto) {
      atualizarCampo.mutate(
        {
          id: modalCampoAberto.id,
          dto: paraAtualizacao(dto),
          etag: envioDoCampo.etag,
        },
        {
          onSuccess: () => setModalCampoAberto(null),
          onError: (erro) => {
            envioDoCampo.registrarErro(erro)
            setErroCampo(mensagemDeErroDeEscrita(erro))
          },
        },
      )
    }
  }

  function alternarPublicacao(publicado: boolean, etag?: string) {
    setErroDePublicacao(null)
    publicarVersao.mutate(
      { id: versaoId, publicado, etag },
      { onError: (falha) => setErroDePublicacao(mensagemDeErroDeEscrita(falha, 'acao')) },
    )
  }

  function confirmarVerificacao(verificadoEm: string, etag?: string) {
    setErroDeVerificacao(null)
    verificarVersao.mutate(
      { id: versaoId, verificadoEm, etag },
      { onError: (falha) => setErroDeVerificacao(mensagemDeErroDeEscrita(falha, 'acao')) },
    )
  }

  function alternarPublicacaoDoAviso(aviso: AvisoAdmin) {
    setErroDePublicacaoDoAviso(null)
    publicarAviso.mutate(
      { id: aviso.id, publicado: !aviso.publicado, etag: aviso.etag },
      {
        onError: (falha) =>
          setErroDePublicacaoDoAviso({
            avisoId: aviso.id,
            mensagem: mensagemDeErroDeEscrita(falha, 'acao'),
          }),
      },
    )
  }

  function confirmarRemocaoDeAviso() {
    if (!avisoParaRemover) return

    setErroRemocao(null)
    removerAviso.mutate(
      { id: avisoParaRemover.id, etag: envioDaRemocaoDoAviso.etag },
      {
        onSuccess: () => setAvisoParaRemover(null),
        onError: (erro) => {
          envioDaRemocaoDoAviso.registrarErro(erro)
          setErroRemocao(mensagemDeErroDeEscrita(erro, 'acao'))
        },
      },
    )
  }

  function confirmarRemocaoDeCampo() {
    if (!campoParaRemover) return

    setErroRemocao(null)
    removerCampo.mutate(
      { id: campoParaRemover.id, etag: envioDaRemocaoDoCampo.etag },
      {
        onSuccess: () => setCampoParaRemover(null),
        onError: (erro) => {
          envioDaRemocaoDoCampo.registrarErro(erro)
          setErroRemocao(mensagemDeErroDeEscrita(erro, 'acao'))
        },
      },
    )
  }

  function aoSalvarAviso(dto: AvisoFormDto) {
    setErroAviso(null)

    if (modalAvisoAberto === 'novo') {
      criarAvisoVersao.mutate(
        {
          severidade: dto.severidade,
          titulo: dto.titulo,
          corpo: dto.corpo,
          vigenciaInicio: dto.vigenciaInicio,
          campoVersaoIds: dto.campoVersaoIds,
        },
        {
          onSuccess: () => setModalAvisoAberto(null),
          onError: (erro) => setErroAviso(mensagemDeErroDeEscrita(erro)),
        },
      )
      return
    }

    if (modalAvisoAberto) {
      atualizarAviso.mutate(
        { id: modalAvisoAberto.id, dto, etag: envioDoAviso.etag },
        {
          onSuccess: () => setModalAvisoAberto(null),
          onError: (erro) => {
            envioDoAviso.registrarErro(erro)
            setErroAviso(mensagemDeErroDeEscrita(erro))
          },
        },
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted">
            <Link
              to="/interno/provedores"
              activeOptions={{ exact: true }}
              className="hover:underline"
            >
              Provedores
            </Link>{' '}
            /{' '}
            <Link
              to="/interno/provedores/$provedorId"
              params={{ provedorId: String(provedorId) }}
              activeOptions={{ exact: true }}
              className="hover:underline"
            >
              {provedor?.nome ?? 'Provedor'}
            </Link>{' '}
            / {versao.rotulo}
          </p>
          <h1 className="text-titulo font-bold text-ink">{versao.rotulo}</h1>
          <EtiquetaPublicacao
            publicadoProprio={versao.publicado}
            publicadoEfetivo={publicadoEfetivo}
            motivoOculto={provedor && !provedor.publicado ? provedor.nome : undefined}
          />
        </div>

        {permissoes.versoesProvedor.publicar && (
          <Button
            variant="secondary"
            isLoading={publicarVersao.isPending}
            onClick={() => alternarPublicacao(!versao.publicado, versao.etag)}
          >
            {versao.publicado ? 'Despublicar' : 'Publicar'}
          </Button>
        )}
      </div>

      {erroDePublicacao && (
        <p role="alert" className="text-sm text-error-texto">
          {erroDePublicacao}
        </p>
      )}

      <AbasNavegaveis abas={abas} ariaLabel="Seções da versão" navegacaoPorSetas />

      {aba === 'avisos' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-subtitulo font-medium text-ink">Avisos desta versão</h2>
            {permissoes.avisos.adicionar && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="size-4" />}
                onClick={() => setModalAvisoAberto('novo')}
              >
                Novo aviso
              </Button>
            )}
          </div>

          {versao.avisos.length === 0 && (
            <p className="text-xs text-muted italic">Nenhum aviso cadastrado para esta versão.</p>
          )}

          <ul className="flex flex-col gap-3">
            {versao.avisos.map((aviso) => (
              <AvisoDaVersao
                key={aviso.id}
                aviso={aviso}
                versaoPublicadaEfetiva={publicadoEfetivo}
                rotuloVersao={versao.rotulo}
                erroDePublicacao={
                  erroDePublicacaoDoAviso?.avisoId === aviso.id
                    ? erroDePublicacaoDoAviso.mensagem
                    : null
                }
                acoes={
                  <>
                    {permissoes.avisos.atualizar && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setModalAvisoAberto(aviso)}
                      >
                        Editar
                      </Button>
                    )}
                    {permissoes.avisos.publicar && (
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={
                          publicarAviso.isPending && publicarAviso.variables?.id === aviso.id
                        }
                        onClick={() => alternarPublicacaoDoAviso(aviso)}
                      >
                        {aviso.publicado ? 'Despublicar' : 'Publicar'}
                      </Button>
                    )}
                    {permissoes.avisos.remover && (
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Remover aviso ${aviso.titulo}`}
                        onClick={() => {
                          setErroRemocao(null)
                          setAvisoParaRemover(aviso)
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {aba === 'campos' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-subtitulo font-medium text-ink">Campos desta versão</h2>
            {permissoes.camposVersao.adicionar && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="size-4" />}
                onClick={() => setModalCampoAberto('novo')}
              >
                Novo campo
              </Button>
            )}
          </div>

          {camposCarregando && <Skeleton className="h-10 w-full" />}

          {!camposCarregando && respostaCampos && respostaCampos.campos.length === 0 && (
            <EmptyState message="Nenhum campo documentado nesta versão ainda." />
          )}

          {!camposCarregando && respostaCampos && respostaCampos.campos.length > 0 && (
            <TableRoot rotulo="Campos desta versão">
              <TableHeader>
                <tr>
                  <TableCell header>Campo</TableCell>
                  <TableCell header>Estado</TableCell>
                  <TableCell header>Tipo</TableCell>
                  <TableCell header alinhamento="direita">
                    Ações
                  </TableCell>
                </tr>
              </TableHeader>
              <tbody>
                {respostaCampos.campos.map((campo) => (
                  <TableRow key={campo.id}>
                    <TableCell>{campo.campoLayoutNome}</TableCell>
                    <TableCell>
                      <EtiquetaEstado estado={ESTADO_PARA_TOKEN[campo.estadoPreenchimento]} />
                    </TableCell>
                    <TableCell>{campo.tipo}</TableCell>
                    <TableCell alinhamento="direita">
                      <div className={CLASSE_DAS_ACOES_DA_LINHA}>
                        {permissoes.camposVersao.atualizar && (
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Editar campo ${campo.campoLayoutNome}`}
                            onClick={() => setModalCampoAberto(campo)}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                        )}
                        {permissoes.camposVersao.remover && (
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Remover campo ${campo.campoLayoutNome}`}
                            onClick={() => {
                              setErroRemocao(null)
                              setCampoParaRemover(campo)
                            }}
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
          )}

          {respostaCampos && respostaCampos.camposLayoutAusentes.length > 0 && (
            <div className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-border bg-surface-hover p-4">
              <h3 className="text-sm font-medium text-ink">
                Campos do Layout InvoiCy ainda não documentados nesta versão
              </h3>
              <ul className="text-sm text-ink/70">
                {respostaCampos.camposLayoutAusentes.map((ausente) => (
                  <li key={ausente.id}>{ausente.nome}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {aba === 'exemplos' && (
        <SecaoExemplosVersao
          versaoId={versaoId}
          podeBuscar={permissoes.exemplos.buscar}
          podeAdicionar={permissoes.exemplos.adicionar}
          podeAtualizar={permissoes.exemplos.atualizar}
          podeRemover={permissoes.exemplos.remover}
        />
      )}

      {aba === 'verificacao' && (
        <section className="flex flex-col gap-3">
          <h2 className="text-subtitulo font-medium text-ink">Verificação</h2>
          <p className="text-sm text-muted">
            {versao.verificadoEm
              ? `Última verificação: ${formatarDataCurta(versao.verificadoEm)}`
              : 'Esta versão nunca foi verificada.'}
          </p>

          {permissoes.versoesProvedor.atualizar && (
            <div className="flex items-end gap-3">
              <Input
                label="Marcar como verificado em"
                type="date"
                value={dataVerificacao}
                onChange={(evento) => setDataVerificacao(evento.target.value)}
              />
              <Button
                variant="secondary"
                isLoading={verificarVersao.isPending}
                disabled={!dataVerificacao}
                onClick={() => confirmarVerificacao(dataVerificacao, versao.etag)}
              >
                Confirmar verificação
              </Button>
            </div>
          )}

          {erroDeVerificacao && (
            <p role="alert" className="text-sm text-error-texto">
              {erroDeVerificacao}
            </p>
          )}
        </section>
      )}

      <Modal
        isOpen={modalCampoAberto !== null}
        onClose={() => setModalCampoAberto(null)}
        title={modalCampoAberto === 'novo' ? 'Novo campo' : 'Editar campo'}
        size="lg"
      >
        <CampoVersaoForm
          initialData={modalCampoAberto === 'novo' ? undefined : (modalCampoAberto ?? undefined)}
          opcoesCampoLayout={camposLayout ?? []}
          onSubmit={aoSalvarCampo}
          onCancel={() => setModalCampoAberto(null)}
          isSubmitting={criarCampo.isPending || atualizarCampo.isPending}
          erroServidor={erroCampo}
        />
      </Modal>

      <Modal
        isOpen={modalAvisoAberto !== null}
        onClose={() => setModalAvisoAberto(null)}
        title={modalAvisoAberto === 'novo' ? 'Novo aviso da versão' : 'Editar aviso'}
      >
        <AvisoForm
          escopo="Versao"
          initialData={modalAvisoAberto === 'novo' ? undefined : (modalAvisoAberto ?? undefined)}
          opcoesCamposAfetados={(respostaCampos?.campos ?? []).map((campo) => ({
            id: campo.id,
            rotulo: campo.campoLayoutNome,
          }))}
          onSubmit={aoSalvarAviso}
          onCancel={() => setModalAvisoAberto(null)}
          isSubmitting={criarAvisoVersao.isPending || atualizarAviso.isPending}
          erroServidor={erroAviso}
        />
      </Modal>

      <ModalConfirmacao
        isOpen={avisoParaRemover !== null}
        title="Remover aviso"
        message={`O aviso "${avisoParaRemover?.titulo}" sai desta versão e da página pública dela.`}
        isConfirming={removerAviso.isPending}
        erro={erroRemocao}
        onConfirm={confirmarRemocaoDeAviso}
        onCancel={() => setAvisoParaRemover(null)}
      />

      <ModalConfirmacao
        isOpen={campoParaRemover !== null}
        title="Remover campo"
        message={`O campo "${campoParaRemover?.campoLayoutNome}" deixa de ser documentado nesta versão.`}
        isConfirming={removerCampo.isPending}
        erro={erroRemocao}
        onConfirm={confirmarRemocaoDeCampo}
        onCancel={() => setCampoParaRemover(null)}
      />
    </div>
  )
}
