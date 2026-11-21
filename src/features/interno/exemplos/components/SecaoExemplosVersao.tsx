import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Modal } from '../../../../components/ui/Modal'
import { ModalConfirmacao } from '../../../../components/ui/ModalConfirmacao'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { etagNaColecao } from '../../utils/etagDeConcorrencia'
import { useEtagDeEnvio } from '../../utils/useEtagDeEnvio'
import { useAtualizarExemplo } from '../hooks/useAtualizarExemplo'
import { useCriarExemplo } from '../hooks/useCriarExemplo'
import { useExemplosPorVersao } from '../hooks/useExemplosPorVersao'
import { useRemoverExemplo } from '../hooks/useRemoverExemplo'
import type { CriarExemploDto, ExemploAdmin } from '../types/exemploAdmin'
import { ExemploForm } from './ExemploForm'
import { mensagemDeErroDeEscrita } from '../../utils/mensagemDeErroDeEscrita'
import { CLASSE_DAS_ACOES_DA_LINHA } from '../../utils/classesDaTabelaInterna'

/**
 * Cap de exemplos por versão (C3). O `422` do backend é a rede de segurança
 * real; aqui o botão só desabilita antes para não oferecer um gesto que já se
 * sabe que será recusado.
 */
export const LIMITE_EXEMPLOS_POR_VERSAO = 10

export interface SecaoExemplosVersaoProps {
  versaoId: number
  /** `exemplos-buscar`. É a única seção da tela com `GET` próprio protegido por role. */
  podeBuscar: boolean
  podeAdicionar: boolean
  podeAtualizar: boolean
  podeRemover: boolean
}

/**
 * Seção "Exemplos" da versão na área interna (tela 13). Mesma forma das seções
 * "Avisos" e "Campos" de `idVersao.tsx` (tabela + modal), mas em componente
 * próprio: a página já é longa, e a seção tem os três estados assíncronos dela.
 *
 * As permissões chegam por prop (a página checa uma vez e propaga), nunca por
 * uma segunda chamada de `usePermissoesInterno` aqui dentro.
 */
export function SecaoExemplosVersao({
  versaoId,
  podeBuscar,
  podeAdicionar,
  podeAtualizar,
  podeRemover,
}: SecaoExemplosVersaoProps) {
  const { data: exemplos, isLoading, isError, refetch } = useExemplosPorVersao(versaoId, podeBuscar)

  const criarExemplo = useCriarExemplo(versaoId)
  const atualizarExemplo = useAtualizarExemplo()
  const removerExemplo = useRemoverExemplo()

  const [modalAberto, setModalAberto] = useState<'novo' | ExemploAdmin | null>(null)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [exemploParaRemover, setExemploParaRemover] = useState<ExemploAdmin | null>(null)
  const [erroRemocao, setErroRemocao] = useState<string | null>(null)

  const total = exemplos?.length ?? 0
  const noLimite = total >= LIMITE_EXEMPLOS_POR_VERSAO

  const exemploEmEdicao = typeof modalAberto === 'object' ? modalAberto : null
  const envioDaEdicao = useEtagDeEnvio(
    exemploEmEdicao?.id ?? null,
    etagNaColecao(exemplos, exemploEmEdicao),
  )

  const envioDaRemocao = useEtagDeEnvio(
    exemploParaRemover?.id ?? null,
    etagNaColecao(exemplos, exemploParaRemover),
  )

  function aoSalvar(dto: CriarExemploDto) {
    setErroFormulario(null)

    if (modalAberto === 'novo') {
      criarExemplo.mutate(dto, {
        onSuccess: () => setModalAberto(null),
        onError: (erro) => setErroFormulario(mensagemDeErroDeEscrita(erro)),
      })
      return
    }

    if (modalAberto) {
      atualizarExemplo.mutate(
        { id: modalAberto.id, versaoId, dto, etag: envioDaEdicao.etag },
        {
          onSuccess: () => setModalAberto(null),
          onError: (erro) => {
            envioDaEdicao.registrarErro(erro)
            setErroFormulario(mensagemDeErroDeEscrita(erro))
          },
        },
      )
    }
  }

  function abrirNovo() {
    setErroFormulario(null)
    setModalAberto('novo')
  }

  function abrirEdicao(exemplo: ExemploAdmin) {
    setErroFormulario(null)
    setModalAberto(exemplo)
  }

  function abrirRemocao(exemplo: ExemploAdmin) {
    setErroRemocao(null)
    setExemploParaRemover(exemplo)
  }

  function confirmarRemocao() {
    if (!exemploParaRemover) return

    setErroRemocao(null)
    removerExemplo.mutate(
      { id: exemploParaRemover.id, versaoId, etag: envioDaRemocao.etag },
      {
        onSuccess: () => setExemploParaRemover(null),
        onError: (erro) => {
          envioDaRemocao.registrarErro(erro)
          setErroRemocao(mensagemDeErroDeEscrita(erro, 'acao'))
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-subtitulo font-medium text-ink">Exemplos desta versão</h2>
        {podeAdicionar && (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="size-4" />}
            disabled={noLimite}
            title={
              noLimite
                ? `Limite de ${LIMITE_EXEMPLOS_POR_VERSAO} exemplos por versão atingido.`
                : undefined
            }
            onClick={abrirNovo}
          >
            Novo exemplo
          </Button>
        )}
      </div>

      {!podeBuscar && (
        <EmptyState message="Você não tem permissão para ver os exemplos desta versão." />
      )}

      {podeBuscar && isLoading && (
        <div aria-live="polite" aria-busy="true">
          <span className="sr-only">Carregando exemplos…</span>
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {podeBuscar && !isLoading && isError && (
        <ErrorState
          message="Não foi possível carregar os exemplos desta versão."
          onRetry={() => refetch()}
        />
      )}

      {podeBuscar && !isLoading && !isError && total === 0 && (
        <EmptyState message="Nenhum exemplo cadastrado nesta versão ainda." />
      )}

      {podeBuscar && !isLoading && !isError && total > 0 && (
        <TableRoot rotulo="Exemplos desta versão">
          <TableHeader>
            <tr>
              <TableCell header>Cenário</TableCell>
              <TableCell header>Endereço</TableCell>
              <TableCell header alinhamento="direita">
                Ações
              </TableCell>
            </tr>
          </TableHeader>
          <tbody>
            {exemplos?.map((exemplo) => (
              <TableRow key={exemplo.id}>
                <TableCell>{exemplo.nome}</TableCell>
                <TableCell>
                  <code className="font-mono">#exemplo-{exemplo.slug}</code>
                </TableCell>
                <TableCell alinhamento="direita">
                  <div className={CLASSE_DAS_ACOES_DA_LINHA}>
                    {podeAtualizar && (
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Editar exemplo ${exemplo.nome}`}
                        onClick={() => abrirEdicao(exemplo)}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                    {podeRemover && (
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Remover exemplo ${exemplo.nome}`}
                        onClick={() => abrirRemocao(exemplo)}
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
        title={modalAberto === 'novo' ? 'Novo exemplo' : 'Editar exemplo'}
        size="lg"
      >
        {modalAberto !== null && (
          <ExemploForm
            initialData={modalAberto === 'novo' ? undefined : modalAberto}
            onSubmit={aoSalvar}
            onCancel={() => setModalAberto(null)}
            isSubmitting={criarExemplo.isPending || atualizarExemplo.isPending}
            erroServidor={erroFormulario}
          />
        )}
      </Modal>

      <ModalConfirmacao
        isOpen={exemploParaRemover !== null}
        title="Remover exemplo"
        message={`O exemplo "${exemploParaRemover?.nome}" sai da página pública da versão, e o link #exemplo-${exemploParaRemover?.slug} deixa de funcionar.`}
        isConfirming={removerExemplo.isPending}
        erro={erroRemocao}
        onConfirm={confirmarRemocao}
        onCancel={() => setExemploParaRemover(null)}
      />
    </section>
  )
}
