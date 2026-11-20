import { useEffect, useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Modal } from '../../../../components/ui/Modal'
import { Pagination } from '../../../../components/ui/Pagination'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { Toast } from '../../../../components/ui/Toast'
import { formatarDataCurta } from '../../../../utils/formatarDataVerificacao'
import { useAlterarEstadoLacunaBusca } from '../hooks/useAlterarEstadoLacunaBusca'
import { useTermosLacunaBusca } from '../hooks/useTermosLacunaBusca'
import type { DecisaoLacunaBuscaValores } from '../types/decisaoLacunaBuscaSchema'
import type { LacunaBuscaTermoComEtag } from '../types/lacunaBusca'
import { interpretarErroDeEscritaLacunaBusca } from '../utils/erroDeEscritaLacunaBusca'
import { DecisaoLacunaBuscaForm } from './DecisaoLacunaBuscaForm'

const TAMANHO_PAGINA_PADRAO = 25

type EstadoDecidido = 'Resolvida' | 'Descartada'

interface Decisao {
  termo: LacunaBuscaTermoComEtag
  estado: EstadoDecidido
}

interface AvisoDaFila {
  tom: 'success' | 'warning'
  texto: string
}

interface TextosDaDecisao {
  titulo: string
  verbo: string
  /** Concorda com "termo" (masculino). */
  termoNoParticipio: string
  /** Concorda com "ocorrências" (feminino plural). */
  ocorrenciasNoParticipio: string
  dicaDaNota: string
}

const TEXTOS_DA_DECISAO: Record<EstadoDecidido, TextosDaDecisao> = {
  Resolvida: {
    titulo: 'Resolver termo',
    verbo: 'Resolver',
    termoNoParticipio: 'resolvido',
    ocorrenciasNoParticipio: 'resolvidas',
    dicaDaNota: 'O que foi documentado, ou onde. Ajuda quem buscar o mesmo termo depois.',
  },
  Descartada: {
    titulo: 'Descartar termo',
    verbo: 'Descartar',
    termoNoParticipio: 'descartado',
    ocorrenciasNoParticipio: 'descartadas',
    dicaDaNota: 'Por que não vale documentar (ex.: busca com erro de digitação).',
  },
}

export interface FilaLacunasBuscaProps {
  /** Resolver e descartar exigem a role `lacunasbusca-atualizar`; sem ela a fila só se lê. */
  podeAtualizar: boolean
}

function descreverOcorrencias(quantidade: number): string {
  return quantidade === 1 ? '1 ocorrência' : `${quantidade} ocorrências`
}

function descreverAbrangencia(ocorrencias: number): string {
  return ocorrencias === 1
    ? 'Vale para a ocorrência aberta deste termo.'
    : `Vale para as ${ocorrencias} ocorrências abertas deste termo.`
}

function descreverResultado(decisao: Decisao, mesmoTermoAlteradas: number): string {
  const { termo } = decisao.termo
  const textos = TEXTOS_DA_DECISAO[decisao.estado]

  if (mesmoTermoAlteradas === 0) return `Termo "${termo}" ${textos.termoNoParticipio}.`

  return `${mesmoTermoAlteradas + 1} ocorrências de "${termo}" ${textos.ocorrenciasNoParticipio}.`
}

interface ListaComRestoProps {
  itens: string[]
  /** Total de distintos, inclusive os que o teto do servidor deixou fora de `itens`. */
  total: number
}

/** Os distintos mais recentes, e um "+N" para os que o teto cortou. */
function ListaComResto({ itens, total }: ListaComRestoProps) {
  if (itens.length === 0) return <>-</>

  const resto = total - itens.length

  return (
    <>
      {itens.join(', ')}
      {resto > 0 && (
        <span className="ml-1 text-muted" title={`e mais ${resto}`}>
          +{resto}
        </span>
      )}
    </>
  )
}

/**
 * Fila editorial (escopo §9.2): termos de busca interna sem resultado, uma linha por termo, os
 * mais recorrentes primeiro. Resolver e descartar passam por um diálogo e valem para o termo
 * inteiro - todas as ocorrências abertas dele saem da fila juntas.
 */
export function FilaLacunasBusca({ podeAtualizar }: FilaLacunasBuscaProps) {
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)
  const [decisao, setDecisao] = useState<Decisao | null>(null)
  const [erroNoDialogo, setErroNoDialogo] = useState<string | null>(null)
  const [avisoDaFila, setAvisoDaFila] = useState<AvisoDaFila | null>(null)

  const { data, isLoading, isError, refetch } = useTermosLacunaBusca({
    estado: 'Aberta',
    sortBy: 'ocorrencias',
    sortDirection: 'desc',
    pagina,
    tamanhoPagina,
  })
  const alterarEstado = useAlterarEstadoLacunaBusca()

  // Resolver o último termo da última página deixa a página pedida além do acervo: o servidor
  // responde lista vazia, e sem recuar a fila pareceria vazia com termos ainda abertos.
  useEffect(() => {
    if (data && data.items.length === 0 && pagina > 1) setPagina(Math.max(1, data.totalPages))
  }, [data, pagina])

  function abrirDecisao(termo: LacunaBuscaTermoComEtag, estado: EstadoDecidido) {
    setAvisoDaFila(null)
    setErroNoDialogo(null)
    setDecisao({ termo, estado })
  }

  function fecharDecisao() {
    setDecisao(null)
    setErroNoDialogo(null)
  }

  function confirmarDecisao(valores: DecisaoLacunaBuscaValores) {
    if (!decisao) return

    const { termo, estado } = decisao
    const nota = valores.nota.trim()

    alterarEstado.mutate(
      {
        id: termo.lacunaReferenciaId,
        // Na fila agrupada a decisão é sempre do termo inteiro, nunca de uma ocorrência só.
        dto: { estado, nota: nota || undefined, incluirMesmoTermo: true },
        etag: termo.etag,
      },
      {
        onSuccess: (resultado) => {
          fecharDecisao()
          setAvisoDaFila({
            tom: 'success',
            texto: descreverResultado(decisao, resultado.mesmoTermoAlteradas),
          })
        },
        onError: (erro) => {
          const interpretado = interpretarErroDeEscritaLacunaBusca(erro)

          // Linha velha: o diálogo fecha porque retentar com a mesma versão falharia de novo, e
          // a fila já está sendo recarregada pelo hook.
          if (interpretado.precisaRecarregarFila) {
            fecharDecisao()
            setAvisoDaFila({
              tom: 'warning',
              texto: `${interpretado.mensagem} A fila foi recarregada com o que está valendo agora.`,
            })
            return
          }

          setErroNoDialogo(interpretado.mensagem)
        },
      },
    )
  }

  const textos = decisao ? TEXTOS_DA_DECISAO[decisao.estado] : null

  return (
    <section aria-labelledby="fila-lacunas-titulo" className="flex flex-col gap-4">
      <div>
        <h2 id="fila-lacunas-titulo" className="text-card-titulo font-medium text-ink">
          O que documentar a seguir
        </h2>
        <p className="text-sm text-muted">
          Termos de busca interna que não encontraram nada, dos mais recorrentes para os menos.
        </p>
      </div>

      {avisoDaFila && (
        <Toast
          tone={avisoDaFila.tom}
          message={avisoDaFila.texto}
          onClose={() => setAvisoDaFila(null)}
        />
      )}

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando a fila…</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && (
        <ErrorState
          onRetry={() => {
            void refetch()
          }}
        />
      )}

      {!isLoading && !isError && data && data.items.length === 0 && pagina === 1 && (
        <EmptyState message="Nenhuma lacuna aberta. Quando uma busca interna não achar nada, ela entra aqui." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <TableRoot rotulo="Termos abertos">
            <TableHeader>
              <tr>
                <TableCell header>Termo buscado</TableCell>
                <TableCell header>Ocorrências</TableCell>
                <TableCell header>Parceiros</TableCell>
                <TableCell header>Chamados</TableCell>
                <TableCell header>Primeira ocorrência</TableCell>
                <TableCell header>Última ocorrência</TableCell>
                <TableCell header>Último registro por</TableCell>
                {podeAtualizar && <TableCell header>Ações</TableCell>}
              </tr>
            </TableHeader>
            <tbody>
              {data.items.map((termo) => (
                <TableRow key={termo.termoNormalizado}>
                  <TableCell className="font-medium">{termo.termo}</TableCell>
                  <TableCell>{descreverOcorrencias(termo.ocorrencias)}</TableCell>
                  <TableCell>
                    <ListaComResto itens={termo.parceiros} total={termo.totalParceiros} />
                  </TableCell>
                  <TableCell>
                    <ListaComResto itens={termo.chamados} total={termo.totalChamados} />
                  </TableCell>
                  <TableCell>{formatarDataCurta(termo.primeiraEm)}</TableCell>
                  <TableCell>{formatarDataCurta(termo.ultimaEm)}</TableCell>
                  <TableCell>{termo.ultimoRegistradoPorNome ?? 'Nome não informado'}</TableCell>
                  {podeAtualizar && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Resolver termo ${termo.termo}`}
                          onClick={() => abrirDecisao(termo, 'Resolvida')}
                        >
                          Resolver
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Descartar termo ${termo.termo}`}
                          onClick={() => abrirDecisao(termo, 'Descartada')}
                        >
                          Descartar
                        </Button>
                      </div>
                    </TableCell>
                  )}
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
        isOpen={decisao !== null}
        onClose={fecharDecisao}
        title={textos?.titulo ?? 'Decidir termo'}
        size="sm"
      >
        {decisao && textos && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">
              Termo buscado: <strong>{decisao.termo.termo}</strong>
            </p>
            <p className="text-sm text-muted">{descreverAbrangencia(decisao.termo.ocorrencias)}</p>

            <DecisaoLacunaBuscaForm
              // Remonta ao trocar de termo ou de decisão: os defaults do RHF só são lidos na
              // montagem, e reaproveitar a instância manteria a nota anterior.
              key={`${decisao.termo.termoNormalizado}-${decisao.estado}`}
              rotuloConfirmacao={textos.verbo}
              dicaDaNota={textos.dicaDaNota}
              onSubmit={confirmarDecisao}
              onCancel={fecharDecisao}
              isSubmitting={alterarEstado.isPending}
              erroServidor={erroNoDialogo}
            />
          </div>
        )}
      </Modal>
    </section>
  )
}
