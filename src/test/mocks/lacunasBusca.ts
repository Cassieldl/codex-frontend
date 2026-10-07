/**
 * JSON literal transcrito de `LacunaBuscaDto` e `LacunaBuscaTermoDto` (`codex-backend`,
 * `LacunaBuscaDtos.cs`), como o servidor serializa. Sem anotação com o tipo do cliente, de
 * propósito: tipar o mock pela interface do front faria o compilador forçar o mock a ter a forma
 * que o cliente acredita, e o teste confirmaria o mock em vez do contrato.
 */

/** Uma ocorrência (`LacunaBuscaDto`): resposta do `POST` e das escritas de estado. */
export const LACUNA_RECORRENTE = {
  id: 41,
  termo: 'E0117 ipm',
  parceiro: 'Prefeitura de Exemplo',
  numeroChamado: '4521',
  estado: 'Aberta',
  nota: null,
  registradoPorNome: 'Maria Souza',
  registradoEm: '2026-10-05T14:30:00+00:00',
  resolvidaEm: null,
  resolvidoPorNome: null,
  ocorrenciasAbertas: 3,
  versaoConcorrencia: 7,
}

/** Termo recorrente (`LacunaBuscaTermoDto`): 3 ocorrências, 2 parceiros e 2 chamados. */
export const TERMO_RECORRENTE = {
  termoNormalizado: 'e0117 ipm',
  termo: 'E0117 ipm',
  ocorrencias: 3,
  primeiraEm: '2026-10-01T12:00:00+00:00',
  ultimaEm: '2026-10-05T12:00:00+00:00',
  parceiros: ['Prefeitura de Exemplo', 'Prefeitura Vizinha'],
  totalParceiros: 2,
  chamados: ['4521', '4400'],
  totalChamados: 2,
  ultimoRegistradoPorNome: 'Maria Souza',
  lacunaReferenciaId: 41,
  versaoConcorrencia: 7,
}

/** Termo de uma ocorrência só, sem parceiro, sem chamado e com token sem `name`. */
export const TERMO_SEM_CONTEXTO = {
  termoNormalizado: 'cancelamento fora do prazo',
  termo: 'cancelamento fora do prazo',
  ocorrencias: 1,
  primeiraEm: '2026-10-04T12:00:00+00:00',
  ultimaEm: '2026-10-04T12:00:00+00:00',
  parceiros: [],
  totalParceiros: 0,
  chamados: [],
  totalChamados: 0,
  ultimoRegistradoPorNome: null,
  lacunaReferenciaId: 42,
  versaoConcorrencia: 2,
}

/** Termo cujas listas passaram do teto de 10 do servidor: 10 devolvidos de 14 e 12 distintos. */
export const TERMO_COM_RESTO = {
  termoNormalizado: 'rejeicao generica',
  termo: 'rejeição genérica',
  ocorrencias: 20,
  primeiraEm: '2026-09-01T12:00:00+00:00',
  ultimaEm: '2026-10-03T12:00:00+00:00',
  parceiros: [
    'Parceiro 14',
    'Parceiro 13',
    'Parceiro 12',
    'Parceiro 11',
    'Parceiro 10',
    'Parceiro 9',
    'Parceiro 8',
    'Parceiro 7',
    'Parceiro 6',
    'Parceiro 5',
  ],
  totalParceiros: 14,
  chamados: ['9012', '9011', '9010', '9009', '9008', '9007', '9006', '9005', '9004', '9003'],
  totalChamados: 12,
  ultimoRegistradoPorNome: 'Bruno Lima',
  lacunaReferenciaId: 43,
  versaoConcorrencia: 5,
}

/** `PaginatedResponse<LacunaBuscaTermoDto>`: cru na raiz, sem envelope `data`. */
export function respostaListaTermos(
  items: object[],
  extras: Partial<{ totalCount: number; page: number; pageSize: number; totalPages: number }> = {},
) {
  return {
    items,
    totalCount: items.length,
    page: 1,
    pageSize: 25,
    totalPages: Math.max(1, Math.ceil(items.length / 25)),
    ...extras,
  }
}
