import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { ItemDoMenuDeAcoes, MenuDeAcoes } from '../../../../components/ui/MenuDeAcoes'
import { Modal } from '../../../../components/ui/Modal'
import { Pagination } from '../../../../components/ui/Pagination'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { useFocoNaLinhaAposTroca } from '../../hooks/useFocoNaLinhaAposTroca'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { usePublicarVersaoLayout } from '../../hooks/usePublicarVersaoLayout'
import {
  CLASSE_DAS_ACOES_DA_LINHA,
  CLASSE_DO_NOME_EDITAVEL,
} from '../../utils/classesDaTabelaInterna'
import { etagNaColecao } from '../../utils/etagDeConcorrencia'
import { useEtagDeEnvio } from '../../utils/useEtagDeEnvio'
import { VersaoLayoutForm, type VersaoLayoutFormDto } from '../components/VersaoLayoutForm'
import { useAtualizarVersaoLayout } from '../hooks/useAtualizarVersaoLayout'
import { useCriarVersaoLayout } from '../hooks/useCriarVersaoLayout'
import { useVersoesLayout } from '../hooks/useVersoesLayout'
import type { VersaoLayoutAdmin } from '../types/versaoLayoutAdmin'
import { mensagemDeErroDeEscrita } from '../../utils/mensagemDeErroDeEscrita'

const TAMANHO_PAGINA_PADRAO = 25

/** Falha ao publicar ou despublicar, mostrada na linha da versão que a causou. */
interface ErroDePublicacao {
  versaoLayoutId: number
  mensagem: string
}

export function CamposLayoutPage() {
  const permissoes = usePermissoesInterno()
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)
  const [modalAberto, setModalAberto] = useState<'novo' | VersaoLayoutAdmin | null>(null)
  const [erroServidor, setErroServidor] = useState<string | null>(null)
  const [erroDePublicacao, setErroDePublicacao] = useState<ErroDePublicacao | null>(null)

  const { data, isLoading, isError, refetch } = useVersoesLayout({ pagina, tamanhoPagina })
  const devolverFocoNaLinha = useFocoNaLinhaAposTroca(data)
  const criarVersaoLayout = useCriarVersaoLayout()
  const atualizarVersaoLayout = useAtualizarVersaoLayout()
  const publicarVersaoLayout = usePublicarVersaoLayout()

  const versaoEmEdicao = typeof modalAberto === 'object' ? modalAberto : null
  const envioDaEdicao = useEtagDeEnvio(
    versaoEmEdicao?.id ?? null,
    etagNaColecao(data?.items, versaoEmEdicao),
  )

  function aoSalvar(dto: VersaoLayoutFormDto) {
    setErroServidor(null)

    if (modalAberto === 'novo') {
      // A versão nasce `Prevista`: a criação não leva estado.
      const { estado: _estado, ...dadosDaCriacao } = dto
      criarVersaoLayout.mutate(dadosDaCriacao, {
        onSuccess: () => setModalAberto(null),
        onError: (erro) => setErroServidor(mensagemDeErroDeEscrita(erro)),
      })
      return
    }

    if (modalAberto) {
      // `estado` é a transição de I15c: o backend aceita o campo no
      // `AtualizarVersaoLayoutDto` e responde 422 quando a transição é
      // inválida (erro exibido no próprio modal, sem limpar o formulário).
      atualizarVersaoLayout.mutate(
        {
          id: modalAberto.id,
          dto,
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

  function alternarPublicacao(versaoLayout: VersaoLayoutAdmin) {
    setErroDePublicacao(null)
    publicarVersaoLayout.mutate(
      { id: versaoLayout.id, publicado: !versaoLayout.publicado, etag: versaoLayout.etag },
      {
        onSuccess: () => devolverFocoNaLinha(`linha-versaoLayout-${versaoLayout.id}`),
        onError: (falha) =>
          setErroDePublicacao({
            versaoLayoutId: versaoLayout.id,
            mensagem: mensagemDeErroDeEscrita(falha, 'acao'),
          }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-titulo font-bold text-ink">Campos do layout</h1>
          <p className="text-sm text-muted">
            Versões do Layout InvoiCy e vocabulário canônico de campos.
          </p>
        </div>
        {permissoes.versoesLayout.adicionar && (
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalAberto('novo')}>
            Nova versão do layout
          </Button>
        )}
      </div>

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando versões do layout…</span>
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState message="Nenhuma versão do Layout InvoiCy cadastrada ainda." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <TableRoot rotulo="Versões do Layout InvoiCy">
            <TableHeader>
              <tr>
                <TableCell header>Rótulo</TableCell>
                <TableCell header>Estado</TableCell>
                <TableCell header>Publicação</TableCell>
                <TableCell header alinhamento="direita">
                  Ações
                </TableCell>
              </tr>
            </TableHeader>
            <tbody>
              {data.items.map((versaoLayout) => (
                <TableRow key={versaoLayout.id} id={`linha-versaoLayout-${versaoLayout.id}`}>
                  <TableCell>
                    <Link
                      to="/interno/campos-layout/$versaoLayoutId"
                      params={{ versaoLayoutId: String(versaoLayout.id) }}
                      className={CLASSE_DO_NOME_EDITAVEL}
                    >
                      {versaoLayout.rotulo}
                    </Link>
                  </TableCell>
                  <TableCell>{versaoLayout.estado}</TableCell>
                  <TableCell>
                    <EtiquetaPublicacao
                      publicadoProprio={versaoLayout.publicado}
                      publicadoEfetivo={versaoLayout.publicado}
                    />
                  </TableCell>
                  <TableCell alinhamento="direita">
                    <div className={CLASSE_DAS_ACOES_DA_LINHA}>
                      {permissoes.versoesLayout.publicar && !versaoLayout.publicado && (
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={
                            publicarVersaoLayout.isPending &&
                            publicarVersaoLayout.variables?.id === versaoLayout.id
                          }
                          onClick={() => alternarPublicacao(versaoLayout)}
                        >
                          Publicar
                        </Button>
                      )}
                      {(permissoes.versoesLayout.atualizar ||
                        (permissoes.versoesLayout.publicar && versaoLayout.publicado)) && (
                        <MenuDeAcoes
                          rotulo={`Mais ações da versão do layout ${versaoLayout.rotulo}`}
                          isLoading={
                            versaoLayout.publicado &&
                            publicarVersaoLayout.isPending &&
                            publicarVersaoLayout.variables?.id === versaoLayout.id
                          }
                        >
                          {permissoes.versoesLayout.atualizar && (
                            <ItemDoMenuDeAcoes onSelecionar={() => setModalAberto(versaoLayout)}>
                              Editar dados da versão
                            </ItemDoMenuDeAcoes>
                          )}
                          {permissoes.versoesLayout.publicar && versaoLayout.publicado && (
                            <ItemDoMenuDeAcoes
                              onSelecionar={() => alternarPublicacao(versaoLayout)}
                            >
                              Despublicar
                            </ItemDoMenuDeAcoes>
                          )}
                        </MenuDeAcoes>
                      )}
                    </div>
                    {erroDePublicacao?.versaoLayoutId === versaoLayout.id && (
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
        title={
          modalAberto === 'novo'
            ? 'Nova versão do Layout InvoiCy'
            : 'Editar versão do Layout InvoiCy'
        }
      >
        <VersaoLayoutForm
          modo={modalAberto === 'novo' ? 'criar' : 'editar'}
          initialData={modalAberto === 'novo' ? undefined : (modalAberto ?? undefined)}
          onSubmit={aoSalvar}
          onCancel={() => setModalAberto(null)}
          isSubmitting={criarVersaoLayout.isPending || atualizarVersaoLayout.isPending}
          erroServidor={erroServidor}
        />
      </Modal>
    </div>
  )
}
