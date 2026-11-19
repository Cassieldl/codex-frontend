import type { CampoLayoutPublico } from '../types/layoutPublico'

export interface MarcasDoCampoNaEstrutura {
  novoNestaVersao: boolean
  reformaTributaria: boolean
}

type CampoDoDicionario = {
  campo: Pick<CampoLayoutPublico, 'novoNestaVersao' | 'reformaTributaria'>
}

const SEM_MARCAS: MarcasDoCampoNaEstrutura = { novoNestaVersao: false, reformaTributaria: false }

/**
 * O nó da estrutura não traz as marcas do campo: elas vêm do dicionário da mesma versão, cruzado
 * pelo `campoSlug` da tag. Tag sem campo, ou com campo fora do dicionário, fica sem marca.
 */
export function marcasDoCampoNaEstrutura(
  campoSlug: string | null,
  camposPorSlug: ReadonlyMap<string, CampoDoDicionario>,
): MarcasDoCampoNaEstrutura {
  if (campoSlug === null) return SEM_MARCAS

  const campo = camposPorSlug.get(campoSlug)?.campo
  if (!campo) return SEM_MARCAS

  return {
    novoNestaVersao: campo.novoNestaVersao,
    reformaTributaria: campo.reformaTributaria,
  }
}
