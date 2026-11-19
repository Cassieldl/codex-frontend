import type { ErroResumoPublico, GrupoCampoVersao } from '../types/versaoProvedorPagina'
import { separarDestinos } from '../utils/destinosXml'

export interface CampoDoErro {
  slug: string
  nome: string
  /** Tags do provedor que recebem o valor do campo; vazia quando o destino não foi mapeado. */
  tagsDoProvedor: string[]
  /** Erros conhecidos ligados ao campo nesta versão. */
  rejeicoes: number
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
      campos.push({
        slug: campo.campoLayoutSlug,
        nome: campo.nome,
        tagsDoProvedor: separarDestinos(campo.destinoXml).flatMap((destino) =>
          destino.tipo === 'caminho' ? [destino.tag] : [],
        ),
        rejeicoes: campo.errosConhecidos.length,
      })
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
