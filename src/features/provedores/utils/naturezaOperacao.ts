import type { CampoVersaoPublico, GrupoCampoVersao } from '../types/versaoProvedorPagina'

const TAG_NATUREZA_OPERACAO = 'natOp'

/** Campo `natOp` do layout InvoiCy, comparado pela última tag do caminho. */
export function ehCampoNaturezaOperacao(campo: Pick<CampoVersaoPublico, 'caminhoXml'>): boolean {
  return campo.caminhoXml.split('/').at(-1) === TAG_NATUREZA_OPERACAO
}

/** "a/b/tribMun/tribISSQN" vira "tribISSQN (grupo tribMun)". */
export function descreverTagDeDestino(destinoXml: string): string {
  const partes = destinoXml.split('/').filter(Boolean)
  const tag = partes.at(-1) ?? destinoXml
  const grupo = partes.at(-2)
  return grupo ? `${tag} (grupo ${grupo})` : tag
}

/** Tag do provedor que recebe o `natOp`, ou null quando a versão não traz o destino. */
export function destinoDaNaturezaOperacao(camposPorGrupo: GrupoCampoVersao[]): string | null {
  const campo = camposPorGrupo
    .flatMap((grupo) => grupo.campos)
    .find((item) => ehCampoNaturezaOperacao(item) && item.destinoXml)

  return campo?.destinoXml ? descreverTagDeDestino(campo.destinoXml) : null
}
