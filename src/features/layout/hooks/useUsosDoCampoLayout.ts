import { useQuery } from '@tanstack/react-query'
import type { EstadoPreenchimentoCampo } from '../../provedores/types/versaoProvedorPagina'
import { useDebounce } from '../../busca/hooks/useDebounce'
import type { CampoLayoutVerbete, UsoCampoLayout } from '../types/layoutPublico'
import { layoutKeys } from './layoutKeys'
import { buscarCampoLayout } from './useCampoLayoutPorSlug'

export interface ResultadoUsosDoCampoLayout {
  usos: UsoCampoLayout[] | undefined
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const DEZ_MINUTOS_MS = 1000 * 60 * 10

/** Segurar ←/→ no modal não pode virar uma requisição por campo atravessado. */
const ATRASO_DA_NAVEGACAO_MS = 250

const ESTADOS_DE_PREENCHIMENTO: readonly string[] = ['Obrigatorio', 'Opcional', 'Condicional']

function ehEstadoDePreenchimento(valor: unknown): valor is EstadoPreenchimentoCampo {
  return typeof valor === 'string' && ESTADOS_DE_PREENCHIMENTO.includes(valor)
}

/**
 * Valida o contrato dos usos. Chave obrigatória ausente é defeito do servidor, não "sem dado":
 * `destinoXml: null` é válido (o provedor não tem destino), mas a chave tem de existir.
 */
function exigirUsosDoCampo(verbete: CampoLayoutVerbete): UsoCampoLayout[] {
  if (!Array.isArray(verbete.ondeEUsado)) {
    throw new Error('A resposta da API não trouxe a coleção "ondeEUsado", que o contrato exige.')
  }

  return verbete.ondeEUsado.map((uso) => {
    if (!('destinoXml' in uso)) {
      throw new Error(
        `A resposta da API não trouxe destinoXml em ondeEUsado (provedor ${uso.provedorSlug}).`,
      )
    }

    if (!ehEstadoDePreenchimento(uso.estadoPreenchimento)) {
      throw new Error(
        `A resposta da API não trouxe estadoPreenchimento em ondeEUsado (provedor ${uso.provedorSlug}).`,
      )
    }

    return {
      ...uso,
      destinoXml: uso.destinoXml ?? null,
      estadoPreenchimento: uso.estadoPreenchimento,
    }
  })
}

/**
 * Slug do campo depois de parado por 250 ms. Tem de ser chamado por quem **não** remonta ao
 * navegar: o conteúdo do modal remonta a cada campo, e um atraso guardado lá dentro recomeçaria
 * com o valor novo já assentado - a requisição sairia na hora, sem atraso nenhum.
 */
export function useSlugAssentadoDoCampo(campoSlug: string): string {
  return useDebounce(campoSlug, ATRASO_DA_NAVEGACAO_MS)
}

/**
 * Usos do campo por provedor (`ondeEUsado` de P12), buscados para o slug assentado. Durante o
 * atraso da navegação o título do modal já é do campo novo e o dado ainda é do anterior: enquanto
 * os dois slugs diferem o hook devolve `isLoading`, nunca os usos do campo que saiu.
 */
export function useUsosDoCampoLayout(
  campoSlug: string,
  slugAssentado: string,
): ResultadoUsosDoCampoLayout {
  const consulta = useQuery({
    queryKey: layoutKeys.campo(slugAssentado),
    queryFn: () => buscarCampoLayout(slugAssentado),
    select: exigirUsosDoCampo,
    staleTime: DEZ_MINUTOS_MS,
  })

  const assentado = campoSlug === slugAssentado

  return {
    usos: assentado ? consulta.data : undefined,
    isLoading: !assentado || consulta.isPending,
    isError: assentado && consulta.isError,
    refetch: () => void consulta.refetch(),
  }
}
