import { useQueries } from '@tanstack/react-query'
import { consultaVersoesProvedorAdmin } from '../../provedores/hooks/useVersoesProvedorAdmin'
import { useProvedoresAdmin } from '../../provedores/hooks/useProvedoresAdmin'
import type { OpcaoVersaoProvedorErro, StatusOpcoesVersoes } from '../components/ErroForm'

const TAMANHO_PAGINA_PROVEDORES = 200

// As versões mudam pouco: reabrir o modal na mesma visita não relê os N provedores.
const VERSOES_FRESCAS_POR_MS = 5 * 60 * 1000

export interface OpcoesVersoesProvedorErro {
  opcoes: OpcaoVersaoProvedorErro[]
  status: StatusOpcoesVersoes
  refetch: () => void
}

/**
 * Opções de "provedores e versões aplicáveis" do `ErroForm`: a lista de provedores e uma query de
 * versões para cada um, com a mesma chave de `useVersoesProvedorAdmin` para dividir o cache.
 *
 * Só busca com `ativo`, que a página liga com o modal de criar ou editar aberto: a lista de erros
 * sozinha não dispara as N leituras.
 *
 * O `status` só sai de `pronto` enquanto alguma lista ainda não chegou ou falhou na primeira
 * leitura: refetch em segundo plano com dados na mão não tira as opções da tela.
 */
export function useOpcoesVersoesProvedorErro(ativo: boolean): OpcoesVersoesProvedorErro {
  const provedoresAdmin = useProvedoresAdmin(
    { tamanhoPagina: TAMANHO_PAGINA_PROVEDORES },
    { enabled: ativo },
  )
  const provedores = ativo ? (provedoresAdmin.data?.items ?? []) : []

  const versoesPorProvedor = useQueries({
    queries: provedores.map((provedor) => ({
      ...consultaVersoesProvedorAdmin(provedor.id),
      staleTime: VERSOES_FRESCAS_POR_MS,
    })),
  })

  const consultas = [provedoresAdmin, ...versoesPorProvedor]

  const opcoes = provedores.flatMap((provedor, indice) =>
    (versoesPorProvedor[indice]?.data ?? []).map((versao) => ({
      id: versao.id,
      rotulo: `${provedor.nome} · ${versao.rotulo}`,
    })),
  )

  function refetch() {
    for (const consulta of consultas) {
      if (consulta.isLoadingError) void consulta.refetch()
    }
  }

  let status: StatusOpcoesVersoes = 'pronto'
  if (consultas.some((consulta) => consulta.isPending)) status = 'carregando'
  if (consultas.some((consulta) => consulta.isLoadingError)) status = 'erro'

  return { opcoes, status, refetch }
}
