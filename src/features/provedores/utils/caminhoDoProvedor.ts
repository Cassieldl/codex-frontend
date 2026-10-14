/** `/provedores/{provedor}` ou `/provedores/{provedor}/{versao}` — o mesmo desenho da rota. */
export function caminhoDoProvedor(provedorSlug: string, versaoSlug?: string): string {
  return versaoSlug ? `/provedores/${provedorSlug}/${versaoSlug}` : `/provedores/${provedorSlug}`
}
