/** `/provedores/{provedor}`: o mesmo desenho da rota da página pública do provedor. */
export function caminhoDoProvedor(provedorSlug: string): string {
  return `/provedores/${provedorSlug}`
}
