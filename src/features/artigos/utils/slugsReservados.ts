/**
 * Slug do artigo em posição fixa (D2) - a rota `/como-funciona` é sempre
 * navegação, mesmo antes de o artigo existir (§4.1).
 *
 * Espelha `Codex.Domain/Constantes/SlugsReservadosArtigo.ComoFunciona` **por
 * valor**: são repositórios diferentes e não há como compartilhar a constante
 * entre as stacks. `slugsReservados.test.ts` trava a literal - mudar o valor
 * aqui sem mudar `SlugsReservadosArtigo.cs` (e vice-versa) quebra a rota
 * canônica em silêncio.
 */
export const SLUG_COMO_FUNCIONA = 'como-funciona'
