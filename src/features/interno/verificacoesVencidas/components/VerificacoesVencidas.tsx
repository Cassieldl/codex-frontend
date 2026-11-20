import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import { Pagination } from '../../../../components/ui/Pagination'
import { Select } from '../../../../components/ui/Select'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { TableCell, TableHeader, TableRoot, TableRow } from '../../../../components/ui/Table'
import { formatarDataCurta } from '../../../../utils/formatarDataVerificacao'
import { useVerificacoesVencidas } from '../hooks/useVerificacoesVencidas'
import {
  DIAS_VERIFICACAO_PADRAO,
  OPCOES_DIAS_VERIFICACAO,
  type VerificacaoVencida,
} from '../types/verificacaoVencida'

const TAMANHO_PAGINA_PADRAO = 25

const OPCOES_DO_SELETOR = OPCOES_DIAS_VERIFICACAO.map((dias) => ({
  value: String(dias),
  label: `${dias} dias`,
}))

function descreverSituacao(versao: VerificacaoVencida): string {
  if (versao.verificadoEm === null || versao.diasDesdeVerificacao === null)
    return 'Nunca verificada'

  const dias = versao.diasDesdeVerificacao
  return `Verificada há ${dias === 1 ? '1 dia' : `${dias} dias`}`
}

/**
 * Lista de rotina editorial (escopo §9.1 e §11): versões cuja verificação passou do prazo, as
 * nunca verificadas e as mais antigas primeiro - a ordem vem do servidor e não é refeita aqui.
 * Cada linha leva à tela da versão, onde a verificação é registrada.
 */
export function VerificacoesVencidas() {
  const [dias, setDias] = useState(DIAS_VERIFICACAO_PADRAO)
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)

  const { data, isLoading, isError, refetch } = useVerificacoesVencidas({
    dias,
    pagina,
    tamanhoPagina,
  })

  // Verificar a última versão da última página deixa a página pedida além do acervo: o servidor
  // responde lista vazia, e sem recuar a lista pareceria vazia com versões ainda vencidas.
  useEffect(() => {
    if (data && data.items.length === 0 && pagina > 1) setPagina(Math.max(1, data.totalPages))
  }, [data, pagina])

  function aoTrocarPrazo(valor: string) {
    setDias(Number(valor))
    setPagina(1)
  }

  return (
    <section aria-labelledby="verificacoes-vencidas-titulo" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="verificacoes-vencidas-titulo" className="text-card-titulo font-medium text-ink">
            Verificações vencidas
          </h2>
          <p className="text-sm text-muted">
            Versões sem verificação há {dias} dias ou mais, as nunca verificadas e as mais antigas
            primeiro.
          </p>
        </div>

        <Select
          label="Prazo sem verificação"
          options={OPCOES_DO_SELETOR}
          value={String(dias)}
          onValueChange={aoTrocarPrazo}
          className="w-44"
        />
      </div>

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando as verificações vencidas…</span>
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
        <EmptyState message="Nenhuma versão com verificação vencida." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <TableRoot rotulo="Versões com verificação vencida">
            <TableHeader>
              <tr>
                <TableCell header>Provedor</TableCell>
                <TableCell header>Versão</TableCell>
                <TableCell header>Situação</TableCell>
                <TableCell header>Verificada em</TableCell>
              </tr>
            </TableHeader>
            <tbody>
              {data.items.map((versao) => (
                <TableRow key={versao.versaoId}>
                  <TableCell>{versao.provedor.nome}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/interno/provedores/$provedorId/versoes/$versaoId"
                        params={{
                          provedorId: String(versao.provedor.id),
                          versaoId: String(versao.versaoId),
                        }}
                        className="font-medium text-ink underline underline-offset-2 hover:shadow-hover"
                      >
                        {versao.rotulo}
                      </Link>
                      {!versao.publicado && (
                        <EtiquetaPublicacao publicadoProprio={false} publicadoEfetivo={false} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{descreverSituacao(versao)}</TableCell>
                  <TableCell>
                    {versao.verificadoEm ? formatarDataCurta(versao.verificadoEm) : '-'}
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
    </section>
  )
}
