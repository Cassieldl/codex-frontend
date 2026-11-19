import { normalizarParaBusca } from '../../../utils/blocosDoLayout'
import type { CampoLayoutPublico } from '../types/layoutPublico'

export interface FiltroDoDicionario {
  termo: string
  somenteReformaTributaria: boolean
  /** "Só o que mudou": só os campos novos nesta versão. */
  somenteNovos: boolean
}

/**
 * O termo vale para nome, caminho no XML e significado, sem diferenciar caixa nem acento. Termo
 * vazio (ou só espaços) não filtra nada. `somenteReformaTributaria` e `somenteNovos` só deixam
 * passar o campo que tem a marca, e o termo ainda vale sobre ele.
 */
export function campoPassaNoDicionario(
  campo: CampoLayoutPublico,
  { termo, somenteReformaTributaria, somenteNovos }: FiltroDoDicionario,
): boolean {
  if (somenteReformaTributaria && !campo.reformaTributaria) return false
  if (somenteNovos && !campo.novoNestaVersao) return false

  const termoNormalizado = normalizarParaBusca(termo)
  if (termoNormalizado === '') return true

  return [campo.nome, campo.caminhoXml, campo.significado].some((texto) =>
    normalizarParaBusca(texto).includes(termoNormalizado),
  )
}

export function filtroDoDicionarioAtivo({
  termo,
  somenteReformaTributaria,
  somenteNovos,
}: FiltroDoDicionario): boolean {
  return somenteReformaTributaria || somenteNovos || termo.trim() !== ''
}
