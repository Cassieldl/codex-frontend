import type {
  CampoVersaoPublico,
  GrupoCampoVersao,
  NaturezaOperacaoPublica,
} from '../types/versaoProvedorPagina'

const TAG_NATUREZA_OPERACAO = 'natOp'

/** Tag do provedor que recebe um campo e o grupo pai dela, quando o caminho tem. */
export interface TagDeDestino {
  tag: string
  grupo: string | null
}

/** Campo `natOp` do layout InvoiCy, comparado pela última tag do caminho. */
export function ehCampoNaturezaOperacao(campo: Pick<CampoVersaoPublico, 'caminhoXml'>): boolean {
  return campo.caminhoXml.split('/').at(-1) === TAG_NATUREZA_OPERACAO
}

/** "a/b/tribMun/tribISSQN" vira a tag "tribISSQN" no grupo "tribMun". */
export function separarTagDeDestino(destinoXml: string): TagDeDestino {
  const partes = destinoXml.split('/').filter(Boolean)
  return { tag: partes.at(-1) ?? destinoXml, grupo: partes.at(-2) ?? null }
}

/** Tag do provedor que recebe o `natOp`, ou null quando a versão não traz o destino. */
export function destinoDaNaturezaOperacao(camposPorGrupo: GrupoCampoVersao[]): TagDeDestino | null {
  const campo = camposPorGrupo
    .flatMap((grupo) => grupo.campos)
    .find((item) => ehCampoNaturezaOperacao(item) && item.destinoXml)

  return campo?.destinoXml ? separarTagDeDestino(campo.destinoXml) : null
}

/**
 * Para cada código que chega ao provedor com o mesmo valor de um código anterior da tabela, o
 * código anterior. O primeiro de cada valor fica de fora: é a referência dos outros.
 */
export function codigosEquivalentesNoProvedor(
  naturezas: readonly Pick<NaturezaOperacaoPublica, 'codigoInvoicy' | 'valorProvedor'>[],
): ReadonlyMap<number, number> {
  const primeiroPorValor = new Map<string, number>()
  const equivalentes = new Map<number, number>()

  for (const { codigoInvoicy, valorProvedor } of naturezas) {
    const valor = valorProvedor.trim()
    const anterior = primeiroPorValor.get(valor)
    if (anterior === undefined) primeiroPorValor.set(valor, codigoInvoicy)
    else if (anterior !== codigoInvoicy) equivalentes.set(codigoInvoicy, anterior)
  }

  return equivalentes
}
