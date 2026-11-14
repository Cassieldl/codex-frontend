import type { ErroResumoPublico, GrupoCampoVersao } from '../types/versaoProvedorPagina'

interface CampoDoErro {
  slug: string
  nome: string
}

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Erro → campos da versão ligados a ele: o vínculo vem dos campos, e aqui é lido ao contrário. */
export function indexarCamposPorErro(grupos: GrupoCampoVersao[]): Map<string, CampoDoErro[]> {
  const indice = new Map<string, CampoDoErro[]>()
  for (const campo of grupos.flatMap((grupo) => grupo.campos)) {
    for (const erro of campo.errosConhecidos) {
      const campos = indice.get(erro.slug) ?? []
      campos.push({ slug: campo.campoLayoutSlug, nome: campo.nome })
      indice.set(erro.slug, campos)
    }
  }
  return indice
}

/** A mensagem observada só acrescenta quando difere do título; na maioria dos erros, é a mesma. */
export function mensagensQueAcrescentam(
  erro: Pick<ErroResumoPublico, 'titulo' | 'variantes'>,
): string[] {
  const titulo = normalizar(erro.titulo).replace(/\.$/, '').trim()
  return erro.variantes.filter(
    (mensagem) => normalizar(mensagem).replace(/\.$/, '').trim() !== titulo,
  )
}
