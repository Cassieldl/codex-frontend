import { normalizarParaBusca } from '../../../utils/blocosDoLayout'
import type { CampoLayoutPublico } from '../types/layoutPublico'

/**
 * O termo vale para nome, caminho no XML e significado, sem diferenciar caixa nem acento. Termo
 * vazio (ou só espaços) não filtra nada.
 */
export function campoPassaNoDicionario(campo: CampoLayoutPublico, termo: string): boolean {
  const termoNormalizado = normalizarParaBusca(termo)
  if (termoNormalizado === '') return true

  return [campo.nome, campo.caminhoXml, campo.significado].some((texto) =>
    normalizarParaBusca(texto).includes(termoNormalizado),
  )
}
