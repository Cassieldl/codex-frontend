import { normalizarParaBusca } from '../../../utils/blocosDoLayout'
import type { CampoLayoutPublico } from '../types/layoutPublico'

export interface FiltroDoDicionario {
  termo: string
  somenteReformaTributaria: boolean
}

/**
 * O termo vale para nome, caminho no XML e significado, sem diferenciar caixa nem acento. Termo
 * vazio (ou só espaços) não filtra nada. Com `somenteReformaTributaria`, só passa o campo da
 * reforma, e o termo ainda vale sobre ele.
 */
export function campoPassaNoDicionario(
  campo: CampoLayoutPublico,
  { termo, somenteReformaTributaria }: FiltroDoDicionario,
): boolean {
  if (somenteReformaTributaria && !campo.reformaTributaria) return false

  const termoNormalizado = normalizarParaBusca(termo)
  if (termoNormalizado === '') return true

  return [campo.nome, campo.caminhoXml, campo.significado].some((texto) =>
    normalizarParaBusca(texto).includes(termoNormalizado),
  )
}

export function filtroDoDicionarioAtivo({
  termo,
  somenteReformaTributaria,
}: FiltroDoDicionario): boolean {
  return somenteReformaTributaria || termo.trim() !== ''
}
