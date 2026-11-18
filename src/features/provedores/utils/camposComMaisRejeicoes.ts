import type { GrupoCampoVersao } from '../types/versaoProvedorPagina'

export interface CampoComRejeicoes {
  slug: string
  nome: string
  rejeicoes: number
}

/**
 * Os campos com mais erros conhecidos ligados, do maior para o menor. Empate fica em ordem
 * alfabética, para a lista não mudar de ordem a cada carga. Campo sem rejeição não entra.
 */
export function camposComMaisRejeicoes(
  grupos: GrupoCampoVersao[],
  limite = 5,
): CampoComRejeicoes[] {
  return grupos
    .flatMap((grupo) => grupo.campos)
    .map((campo) => ({
      slug: campo.campoLayoutSlug,
      nome: campo.nome,
      rejeicoes: campo.errosConhecidos.length,
    }))
    .filter((campo) => campo.rejeicoes > 0)
    .sort((a, b) => b.rejeicoes - a.rejeicoes || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, limite)
}
