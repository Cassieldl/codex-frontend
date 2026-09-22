/**
 * `GET /home` (P9) é um agregador sem parâmetro nenhum — uma única entrada de
 * cache para a página inteira. Por isso não usa `criarFabricaDeChaves`: não há
 * listagem paginada nem detalhe por id para derivar, e `lists()`/`list(params)`
 * nasceriam mortos.
 */
export const homeKeys = { all: ['home'] as const }
