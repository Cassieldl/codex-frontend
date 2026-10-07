/**
 * Uma entrada de cache por contexto (provedores + versão). Sem listagem paginada nem detalhe por
 * id, então não usa `criarFabricaDeChaves`.
 */
export const comunicadosKeys = {
  all: ['comunicados'] as const,
  contexto: (provedorSlugs: readonly string[], versaoSlug: string | null) =>
    [...comunicadosKeys.all, 'contexto', provedorSlugs, versaoSlug] as const,
}
