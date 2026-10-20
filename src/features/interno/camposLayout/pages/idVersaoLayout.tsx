import { Link } from '@tanstack/react-router'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Modal } from '../../../../components/ui/Modal'
import { ModalConfirmacao } from '../../../../components/ui/ModalConfirmacao'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { formatarVersaoLayout } from '../../../../utils/versaoDoLayout'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarCampoLayout } from '../../hooks/usePublicarCampoLayout'
import { etagNaColecao } from '../../utils/etagDeConcorrencia'
import { useEtagDeEnvio } from '../../utils/useEtagDeEnvio'
import { CampoLayoutForm, type CampoLayoutFormDto } from '../components/CampoLayoutForm'
import { useAtualizarCampoLayout } from '../hooks/useAtualizarCampoLayout'
import { useCamposLayoutPorVersao } from '../hooks/useCamposLayoutPorVersao'
import { useCriarCampoLayout } from '../hooks/useCriarCampoLayout'
import { useRemoverCampoLayout } from '../hooks/useRemoverCampoLayout'
import { useVersoesLayout } from '../hooks/useVersoesLayout'
import type { CampoLayoutAdmin } from '../types/campoLayoutAdmin'
import { mensagemDeErroDeEscrita } from '../../utils/mensagemDeErroDeEscrita'

/** Falha ao publicar ou despublicar, mostrada na linha do campo que a causou. */
interface ErroDePublicacao {
  campoId: number
  mensagem: string
}

export interface IdVersaoLayoutPageProps {
  versaoLayoutId: number
}

export function IdVersaoLayoutPage({ versaoLayoutId }: IdVersaoLayoutPageProps) {
  const permissoes = usePermissoesInterno()

  const { data: campos, isLoading, isError, refetch } = useCamposLayoutPorVersao(versaoLayoutId)
  // Opções de "versão de descontinuação" (§5.1b) — só versões posteriores à
  // atual fazem sentido; a lista completa é pequena o bastante (versões de
  // layout, não campos) para não precisar de busca/paginação aqui.
  const { data: versoesLayout } = useVersoesLayout({ tamanhoPagina: 200 })

  const publicarCampo = usePublicarCampoLayout()
  const criarCampo = useCriarCampoLayout(versaoLayoutId)
  const atualizarCampo = useAtualizarCampoLayout()
  const removerCampo = useRemoverCampoLayout()

  const [modalAberto, setModalAberto] = useState<'novo' | CampoLayoutAdmin | null>(null)
  const [erroServidor, setErroServidor] = useState<string | null>(null)
  const [campoParaRemover, setCampoParaRemover] = useState<CampoLayoutAdmin | null>(null)
  const [erroDeRemocao, setErroDeRemocao] = useState<string | null>(null)
  const [erroDePublicacao, setErroDePublicacao] = useState<ErroDePublicacao | null>(null)

  const opcoesVersaoDescontinuar = (versoesLayout?.items ?? [])
    .filter((versao) => versao.id !== versaoLayoutId)
    .map((versao) => ({ value: String(versao.id), label: versao.rotulo }))

  // A tela edita o vocabulário de UMA versão, e nada nela dizia qual: com mais de uma versão
  // publicada, o editor não tinha como saber onde estava salvando. O rótulo sai da lista que já é
  // carregada para o select de descontinuação — nenhuma requisição a mais.
  const rotuloDaVersao = versoesLayout?.items.find((versao) => versao.id === versaoLayoutId)?.rotulo

  const campoEmEdicao = typeof modalAberto === 'object' ? modalAberto : null
  const envioDaEdicao = useEtagDeEnvio(
    campoEmEdicao?.id ?? null,
    etagNaColecao(campos, campoEmEdicao),
  )

  const envioDaRemocao = useEtagDeEnvio(
    campoParaRemover?.id ?? null,
    etagNaColecao(campos, campoParaRemover),
  )

  function aoSalvar(dto: CampoLayoutFormDto) {
    setErroServidor(null)

    if (modalAberto === 'novo') {
      criarCampo.mutate(
        {
          nome: dto.nome,
          caminhoXml: dto.caminhoXml ?? '',
          significado: dto.significado,
          grupo: dto.grupo,
          ordem: dto.ordem,
        },
        {
          onSuccess: () => setModalAberto(null),
          onError: (erro) => setErroServidor(mensagemDeErroDeEscrita(erro)),
        },
      )
      return
    }

    if (modalAberto) {
      atualizarCampo.mutate(
        {
          id: modalAberto.id,
          versaoLayoutId,
          dto: {
            nome: dto.nome,
            significado: dto.significado,
            grupo: dto.grupo,
            ordem: dto.ordem,
            estado: dto.estado ?? 'Ativo',
            versaoLayoutDescontinuadoId: dto.versaoLayoutDescontinuadoId,
          },
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

  if (isLoading) {
    return (
      <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Carregando campos canônicos…</span>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />
  }

  function alternarPublicacao(campo: CampoLayoutAdmin) {
    setErroDePublicacao(null)
    publicarCampo.mutate(
      { id: campo.id, publicado: !campo.publicado, etag: campo.etag },
      {
        onError: (falha) =>
          setErroDePublicacao({
            campoId: campo.id,
            mensagem: mensagemDeErroDeEscrita(falha, 'acao'),
          }),
      },
    )
  }

  /** A mutation só dispara depois da confirmação — nunca do clique na lista. */
  function confirmarRemocao() {
    if (!campoParaRemover) return

    setErroDeRemocao(null)
    removerCampo.mutate(
      { id: campoParaRemover.id, versaoLayoutId, etag: envioDaRemocao.etag },
      {
        onSuccess: () => setCampoParaRemover(null),
        onError: (falha) => {
          envioDaRemocao.registrarErro(falha)
          setErroDeRemocao(mensagemDeErroDeEscrita(falha, 'acao'))
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted">
            <Link
              to="/interno/campos-layout"
              activeOptions={{ exact: true }}
              className="hover:underline"
            >
              Campos do layout
            </Link>
            {rotuloDaVersao
              ? ` / ${formatarVersaoLayout(rotuloDaVersao, { maiuscula: true })}`
              : null}
          </p>
          <h1 className="text-titulo font-bold text-ink">
            Campos canônicos
            {rotuloDaVersao ? ` do Layout InvoiCy ${formatarVersaoLayout(rotuloDaVersao)}` : ''}
          </h1>
        </div>
        {permissoes.campoLayout.adicionar && (
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalAberto('novo')}>
            Novo campo canônico
          </Button>
        )}
      </div>

      {campos && campos.length === 0 && (
        <EmptyState message="Nenhum campo canônico cadastrado nesta versão do layout ainda." />
      )}

      {campos && campos.length > 0 && (
        <TableRoot rotulo="Campos canônicos da versão">
          <TableHeader>
            <tr>
              <TableCell header>Nome</TableCell>
              <TableCell header>Caminho no XML</TableCell>
              <TableCell header>Estado</TableCell>
              <TableCell header>Publicação</TableCell>
              <TableCell header>Ações</TableCell>
            </tr>
          </TableHeader>
          <tbody>
            {campos.map((campo) => (
              <TableRow key={campo.id}>
                <TableCell>{campo.nome}</TableCell>
                <TableCell className="font-mono">{campo.caminhoXml}</TableCell>
                <TableCell>{campo.estado}</TableCell>
                <TableCell>
                  <EtiquetaPublicacao
                    publicadoProprio={campo.publicado}
                    publicadoEfetivo={campo.publicado}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {permissoes.campoLayout.atualizar && (
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Editar campo canônico ${campo.nome}`}
                        onClick={() => setModalAberto(campo)}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                    {permissoes.campoLayout.publicar && (
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={
                          publicarCampo.isPending && publicarCampo.variables?.id === campo.id
                        }
                        onClick={() => alternarPublicacao(campo)}
                      >
                        {campo.publicado ? 'Despublicar' : 'Publicar'}
                      </Button>
                    )}
                    {permissoes.campoLayout.remover && (
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Remover campo canônico ${campo.nome}`}
                        onClick={() => setCampoParaRemover(campo)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  {erroDePublicacao?.campoId === campo.id && (
                    <p role="alert" className="mt-1 text-sm text-error-texto">
                      {erroDePublicacao.mensagem}
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </TableRoot>
      )}

      <Modal
        isOpen={modalAberto !== null}
        onClose={() => setModalAberto(null)}
        title={modalAberto === 'novo' ? 'Novo campo canônico' : 'Editar campo canônico'}
      >
        <CampoLayoutForm
          modo={modalAberto === 'novo' ? 'criar' : 'editar'}
          initialData={modalAberto === 'novo' ? undefined : (modalAberto ?? undefined)}
          opcoesVersaoLayoutDescontinuar={opcoesVersaoDescontinuar}
          onSubmit={aoSalvar}
          onCancel={() => setModalAberto(null)}
          isSubmitting={criarCampo.isPending || atualizarCampo.isPending}
          erroServidor={erroServidor}
        />
      </Modal>

      <ModalConfirmacao
        isOpen={campoParaRemover !== null}
        title="Remover campo canônico"
        message={`O campo "${campoParaRemover?.nome}" sai do vocabulário desta versão do layout.`}
        isConfirming={removerCampo.isPending}
        erro={erroDeRemocao}
        onConfirm={confirmarRemocao}
        onCancel={() => {
          setCampoParaRemover(null)
          setErroDeRemocao(null)
        }}
      />
    </div>
  )
}
