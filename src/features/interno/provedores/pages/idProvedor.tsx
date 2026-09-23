import { Link } from '@tanstack/react-router'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { EtiquetaSeveridade, type Severidade } from '../../../../components/ui/EtiquetaSeveridade'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Modal } from '../../../../components/ui/Modal'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { handleApiError } from '../../../../utils/handleApiError'
import { useVersoesLayout } from '../../camposLayout/hooks/useVersoesLayout'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarAviso } from '../../hooks/usePublicarAviso'
import { usePublicarProvedor } from '../../hooks/usePublicarProvedor'
import { AvisoForm, type AvisoFormDto } from '../components/AvisoForm'
import { ProvedorForm, type ProvedorFormDto } from '../components/ProvedorForm'
import { TrocarSlugProvedor } from '../components/TrocarSlugProvedor'
import { VersaoProvedorForm, type VersaoProvedorFormDto } from '../components/VersaoProvedorForm'
import { useAtualizarAviso } from '../hooks/useAtualizarAviso'
import { useAtualizarProvedor } from '../hooks/useAtualizarProvedor'
import { useCriarAvisoProvedor } from '../hooks/useCriarAvisoProvedor'
import { useCriarVersaoProvedor } from '../hooks/useCriarVersaoProvedor'
import { useProvedorAdminPorId } from '../hooks/useProvedorAdminPorId'
import { provedoresAdminKeys } from '../hooks/provedoresAdminKeys'
import { useRemoverAviso } from '../hooks/useRemoverAviso'
import { useVersoesProvedorAdmin } from '../hooks/useVersoesProvedorAdmin'
import type { AvisoAdmin } from '../types/avisoAdmin'

const SEVERIDADE_PARA_TOKEN: Record<AvisoAdmin['severidade'], Severidade> = {
  Critico: 'critico',
  Alerta: 'alerta',
  Informativo: 'informativo',
}

export interface IdProvedorPageProps {
  provedorId: number
}

export function IdProvedorPage({ provedorId }: IdProvedorPageProps) {
  const permissoes = usePermissoesInterno()

  const { data: provedor, isLoading, isError, refetch } = useProvedorAdminPorId(provedorId)
  const { data: versoes, isLoading: versoesCarregando } = useVersoesProvedorAdmin(provedorId)
  const { data: versoesLayout } = useVersoesLayout({ tamanhoPagina: 200 })
  const opcoesVersaoLayout = (versoesLayout?.items ?? []).map((versaoLayout) => ({
    value: String(versaoLayout.id),
    label: versaoLayout.rotulo,
  }))

  const publicarProvedor = usePublicarProvedor()
  const publicarAviso = usePublicarAviso()
  const atualizarProvedor = useAtualizarProvedor()
  const criarAvisoProvedor = useCriarAvisoProvedor(provedorId)
  const atualizarAviso = useAtualizarAviso(provedoresAdminKeys.detail(provedorId))
  const removerAviso = useRemoverAviso(provedoresAdminKeys.detail(provedorId))
  const criarVersao = useCriarVersaoProvedor(provedorId)

  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const [erroEditar, setErroEditar] = useState<string | null>(null)

  const [modalAvisoAberto, setModalAvisoAberto] = useState<'novo' | AvisoAdmin | null>(null)
  const [erroAviso, setErroAviso] = useState<string | null>(null)

  const [modalVersaoAberto, setModalVersaoAberto] = useState(false)
  const [erroVersao, setErroVersao] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Carregando provedor…</span>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || !provedor) {
    return <ErrorState onRetry={() => refetch()} />
  }

  function aoEditarProvedor(dto: ProvedorFormDto) {
    setErroEditar(null)
    atualizarProvedor.mutate(
      {
        id: provedorId,
        dto: { nome: dto.nome, categoria: dto.categoria, aliases: dto.aliases },
        etag: provedor?.etag,
      },
      {
        onSuccess: () => setModalEditarAberto(false),
        onError: (erro) => setErroEditar(handleApiError(erro)),
      },
    )
  }

  function aoSalvarAviso(dto: AvisoFormDto) {
    setErroAviso(null)

    if (modalAvisoAberto === 'novo') {
      criarAvisoProvedor.mutate(
        {
          severidade: dto.severidade,
          titulo: dto.titulo,
          corpo: dto.corpo,
          vigenciaInicio: dto.vigenciaInicio,
        },
        {
          onSuccess: () => setModalAvisoAberto(null),
          onError: (erro) => setErroAviso(handleApiError(erro)),
        },
      )
      return
    }

    if (modalAvisoAberto) {
      atualizarAviso.mutate(
        { id: modalAvisoAberto.id, dto, etag: modalAvisoAberto.etag },
        {
          onSuccess: () => setModalAvisoAberto(null),
          onError: (erro) => setErroAviso(handleApiError(erro)),
        },
      )
    }
  }

  function aoCriarVersao(dto: VersaoProvedorFormDto) {
    setErroVersao(null)
    if (!dto.versaoLayoutId) return
    criarVersao.mutate(
      { versaoLayoutId: dto.versaoLayoutId, rotulo: dto.rotulo, introducao: dto.introducao },
      {
        onSuccess: () => setModalVersaoAberto(false),
        onError: (erro) => setErroVersao(handleApiError(erro)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted">
            <Link to="/interno/provedores" className="hover:underline">
              Provedores
            </Link>{' '}
            / {provedor.nome}
          </p>
          <h1 className="text-titulo font-bold text-ink">{provedor.nome}</h1>
          <p className="text-sm text-muted">
            {provedor.categoria === 'Nacional' ? 'Nacional' : 'Próprio'} ·{' '}
            {provedor.identificadorInvoicy}
          </p>
          <p className="font-mono text-xs text-muted">/provedores/{provedor.slug}</p>
          <EtiquetaPublicacao
            publicadoProprio={provedor.publicado}
            publicadoEfetivo={provedor.publicado}
          />
        </div>

        <div className="flex shrink-0 gap-2">
          {permissoes.provedores.atualizar && (
            <Button
              variant="secondary"
              leftIcon={<Pencil className="size-4" />}
              onClick={() => setModalEditarAberto(true)}
            >
              Editar
            </Button>
          )}
          {permissoes.provedores.atualizar && (
            <TrocarSlugProvedor
              provedorId={provedorId}
              slugAtual={provedor.slug}
              etag={provedor.etag}
            />
          )}
          {permissoes.provedores.publicar && (
            <Button
              variant="secondary"
              isLoading={publicarProvedor.isPending}
              onClick={() =>
                publicarProvedor.mutate({
                  id: provedorId,
                  publicado: !provedor.publicado,
                  etag: provedor.etag,
                })
              }
            >
              {provedor.publicado ? 'Despublicar' : 'Publicar'}
            </Button>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-subtitulo font-medium text-ink">Avisos do provedor</h2>
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

        {provedor.avisos.length === 0 && (
          <p className="text-xs text-muted italic">Nenhum aviso cadastrado para este provedor.</p>
        )}

        <ul className="flex flex-col gap-3">
          {provedor.avisos.map((aviso) => (
            <li
              key={aviso.id}
              className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <EtiquetaSeveridade severidade={SEVERIDADE_PARA_TOKEN[aviso.severidade]} />
                <EtiquetaPublicacao
                  publicadoProprio={aviso.publicado}
                  publicadoEfetivo={aviso.publicado && provedor.publicado}
                  motivoOculto={provedor.publicado ? undefined : 'o provedor'}
                />
              </div>
              <h3 className="text-card-titulo font-medium text-ink">{aviso.titulo}</h3>
              <p className="text-sm text-ink/80">{aviso.corpo}</p>
              <div className="flex gap-2">
                {permissoes.avisos.atualizar && (
                  <Button variant="secondary" size="sm" onClick={() => setModalAvisoAberto(aviso)}>
                    Editar
                  </Button>
                )}
                {permissoes.avisos.publicar && (
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={publicarAviso.isPending && publicarAviso.variables?.id === aviso.id}
                    onClick={() =>
                      publicarAviso.mutate({
                        id: aviso.id,
                        publicado: !aviso.publicado,
                        etag: aviso.etag,
                      })
                    }
                  >
                    {aviso.publicado ? 'Despublicar' : 'Publicar'}
                  </Button>
                )}
                {permissoes.avisos.remover && (
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Remover aviso ${aviso.titulo}`}
                    onClick={() => removerAviso.mutate({ id: aviso.id, etag: aviso.etag })}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-subtitulo font-medium text-ink">Versões</h2>
          {permissoes.versoesProvedor.adicionar && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="size-4" />}
              onClick={() => setModalVersaoAberto(true)}
            >
              Nova versão
            </Button>
          )}
        </div>

        {versoesCarregando && <Skeleton className="h-10 w-full" />}

        {!versoesCarregando && versoes && versoes.length === 0 && (
          <EmptyState message="Nenhuma versão cadastrada ainda." />
        )}

        <ul className="flex flex-col gap-2">
          {versoes?.map((versao) => (
            <li
              key={versao.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border px-4 py-3"
            >
              <Link
                to="/interno/provedores/$provedorId/versoes/$versaoId"
                params={{ provedorId: String(provedorId), versaoId: String(versao.id) }}
                className="font-medium text-primary-medium hover:underline"
              >
                {versao.rotulo}
              </Link>
              <EtiquetaPublicacao
                publicadoProprio={versao.publicado}
                publicadoEfetivo={versao.publicado && provedor.publicado}
                motivoOculto={provedor.publicado ? undefined : provedor.nome}
              />
            </li>
          ))}
        </ul>
      </section>

      <Modal
        isOpen={modalEditarAberto}
        onClose={() => setModalEditarAberto(false)}
        title="Editar provedor"
      >
        <ProvedorForm
          initialData={provedor}
          permiteEditarIdentificador={false}
          onSubmit={aoEditarProvedor}
          onCancel={() => setModalEditarAberto(false)}
          isSubmitting={atualizarProvedor.isPending}
          erroServidor={erroEditar}
        />
      </Modal>

      <Modal
        isOpen={modalAvisoAberto !== null}
        onClose={() => setModalAvisoAberto(null)}
        title={modalAvisoAberto === 'novo' ? 'Novo aviso do provedor' : 'Editar aviso'}
      >
        <AvisoForm
          escopo="provedor"
          initialData={modalAvisoAberto === 'novo' ? undefined : (modalAvisoAberto ?? undefined)}
          onSubmit={aoSalvarAviso}
          onCancel={() => setModalAvisoAberto(null)}
          isSubmitting={criarAvisoProvedor.isPending || atualizarAviso.isPending}
          erroServidor={erroAviso}
        />
      </Modal>

      <Modal
        isOpen={modalVersaoAberto}
        onClose={() => setModalVersaoAberto(false)}
        title="Nova versão"
      >
        <VersaoProvedorForm
          opcoesVersaoLayout={opcoesVersaoLayout}
          onSubmit={aoCriarVersao}
          onCancel={() => setModalVersaoAberto(false)}
          isSubmitting={criarVersao.isPending}
          erroServidor={erroVersao}
        />
      </Modal>
    </div>
  )
}
