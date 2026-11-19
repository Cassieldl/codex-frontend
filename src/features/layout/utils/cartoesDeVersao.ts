import type { LayoutIndice, LayoutVersaoResumo } from '../types/layoutPublico'
import { formatarDataDoMarco } from './marcosDaVersao'

export interface CartaoDeVersao {
  versao: LayoutVersaoResumo
  ehVigente: boolean
  /** Partes da linha de fatos, na ordem da tela; a tela junta com " · ". */
  fatos: string[]
}

function contar(quantidade: number, singular: string, plural: string): string {
  return `${String(quantidade)} ${quantidade === 1 ? singular : plural}`
}

/** Campos novos da vigente, só quando há uma anterior para comparar. */
function camposNovosDaVersao(indice: LayoutIndice, versao: LayoutVersaoResumo): number {
  const novidades = indice.novidades
  if (!novidades?.anterior || novidades.versao.slug !== versao.slug) return 0
  return novidades.camposNovos
}

function fatosDaVersao(
  indice: LayoutIndice,
  versao: LayoutVersaoResumo,
  ehVigente: boolean,
): string[] {
  const fatos = [contar(versao.totalCampos, 'campo', 'campos')]
  if (!ehVigente) return fatos

  const novos = camposNovosDaVersao(indice, versao)
  if (novos > 0) fatos.push(contar(novos, 'novo', 'novos'))

  const obrigatoria = formatarDataDoMarco(versao.obrigatoriaEm)
  if (obrigatoria) fatos.push(`obrigatória em ${obrigatoria}`)

  return fatos
}

/**
 * Um cartão por versão publicada, com a vigente na frente e as outras na ordem do backend. Só a
 * vigente fala de novos e de obrigatoriedade; o que o índice não traz fica fora da linha.
 */
export function montarCartoesDeVersao(indice: LayoutIndice): CartaoDeVersao[] {
  const slugDaVigente = indice.vigente?.slug ?? null
  const vigentes = indice.versoes.filter((versao) => versao.slug === slugDaVigente)
  const demais = indice.versoes.filter((versao) => versao.slug !== slugDaVigente)

  return [...vigentes, ...demais].map((versao) => {
    const ehVigente = versao.slug === slugDaVigente
    return { versao, ehVigente, fatos: fatosDaVersao(indice, versao, ehVigente) }
  })
}
