import { Link } from '@tanstack/react-router'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Modal } from '../../../../components/ui/Modal'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { handleApiError } from '../../../../utils/handleApiError'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarCampoLayout } from '../../hooks/usePublicarCampoLayout'
import { CampoLayoutForm, type CampoLayoutFormDto } from '../components/CampoLayoutForm'
import { useAtualizarCampoLayout } from '../hooks/useAtualizarCampoLayout'
import { useCamposLayoutPorVersao } from '../hooks/useCamposLayoutPorVersao'
import { useCriarCampoLayout } from '../hooks/useCriarCampoLayout'
import { useRemoverCampoLayout } from '../hooks/useRemoverCampoLayout'
import { useVersoesLayout } from '../hooks/useVersoesLayout'
import type { CampoLayoutAdmin } from '../types/campoLayoutAdmin'

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

  const opcoesVersaoDescontinuar = (versoesLayout?.items ?? [])
    .filter((versao) => versao.id !== versaoLayoutId)
    .map((versao) => ({ value: String(versao.id), label: versao.rotulo }))

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
          onError: (erro) => setErroServidor(handleApiError(erro)),
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
          etag: modalAberto.etag,
        },
        {
          onSuccess: () => setModalAberto(null),
          onError: (erro) => setErroServidor(handleApiError(erro)),
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted">
            <Link to="/interno/campos-layout" className="hover:underline">
              Campos do layout
            </Link>
          </p>
          <h1 className="text-titulo font-bold text-ink">Campos canônicos</h1>
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
        <TableRoot>
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
                        onClick={() =>
                          publicarCampo.mutate({
                            id: campo.id,
                            publicado: !campo.publicado,
                            etag: campo.etag,
                          })
                        }
                      >
                        {campo.publicado ? 'Despublicar' : 'Publicar'}
                      </Button>
                    )}
                    {permissoes.campoLayout.remover && (
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Remover campo canônico ${campo.nome}`}
                        onClick={() =>
                          removerCampo.mutate({ id: campo.id, versaoLayoutId, etag: campo.etag })
                        }
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
    </div>
  )
}
