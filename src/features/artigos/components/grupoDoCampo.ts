/** Grupo do campo (`Servico/Valores` em `//Servico/Valores/ValAliqISS`); `null` na raiz do RPS, onde só repetiria o nome. */
export function grupoDoCampo(caminhoXml: string): string | null {
  const relativo = caminhoXml.replace(/^\/\//, '')
  const fimDoGrupo = relativo.lastIndexOf('/')
  return fimDoGrupo > 0 ? relativo.slice(0, fimDoGrupo) : null
}
