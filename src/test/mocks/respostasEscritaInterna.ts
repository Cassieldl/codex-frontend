// JSON transcrito dos DTOs internos do backend, sem tipo do cliente, para o mock não herdar a crença dele.

export const avisoAdminDto = {
  id: 9,
  escopo: 'Provedor',
  provedorId: 42,
  versaoProvedorId: null,
  severidade: 'Alerta',
  titulo: 'Instabilidade no webservice',
  corpo: 'O ambiente de homologação recusa lotes acima de 50 RPS.',
  vigenciaInicio: '2026-09-01',
  publicado: false,
  camposAfetadosIds: [],
  versaoConcorrencia: 4,
}

export const provedorAdminDetalheDto = {
  id: 42,
  slug: 'prefeitura-de-exemplo',
  nome: 'Prefeitura de Exemplo',
  categoria: 'Nacional',
  identificadorInvoicy: 'PREF-EXEMPLO',
  publicado: true,
  aliases: ['Exemplo'],
  avisos: [avisoAdminDto],
  versaoConcorrencia: 7,
}

export const versaoAdminDetalheDto = {
  id: 5,
  provedorId: 42,
  slug: 'abrasf-2-04',
  rotulo: 'ABRASF 2.04',
  introducao: null,
  versaoLayoutId: 2,
  publicado: false,
  verificadoEm: null,
  avisos: [],
  versaoConcorrencia: 12,
}

export const campoVersaoAdminDto = {
  id: 81,
  versaoProvedorId: 5,
  campoLayoutId: 3,
  campoLayoutNome: 'Discriminacao',
  tipo: 'Texto',
  tamanho: '2000',
  mascara: null,
  dominio: null,
  estadoPreenchimento: 'Obrigatorio',
  condicao: null,
  exemplo: 'Servico prestado',
  notaPreenchimento: null,
  destinoXml: 'Rps/Discriminacao',
  notaTransformacao: null,
  ordem: 1,
  versaoConcorrencia: 3,
}

export const versaoLayoutAdminDto = {
  id: 2,
  rotulo: '8',
  slug: '8',
  estado: 'Vigente',
  ordem: 8,
  publicado: false,
  descricao: null,
  versaoConcorrencia: 9,
}

export const campoLayoutResponseDto = {
  id: 3,
  versaoLayoutId: 2,
  versaoLayoutDescontinuadoId: null,
  nome: 'Discriminacao',
  caminhoXml: 'Rps/Discriminacao',
  significado: 'Texto livre que descreve o servico prestado.',
  grupo: 'Servico',
  ordem: 1,
  slug: 'discriminacao',
  estado: 'Ativo',
  publicado: false,
  versaoConcorrencia: 6,
}

export const erroAdminDetalheDto = {
  id: 17,
  slug: 'e0117-rps-invalido',
  codigo: 'E0117',
  origem: 'Prefeitura',
  titulo: 'RPS invalido',
  causaProvavel: 'Discriminacao vazia.',
  solucaoSugerida: 'Preencha a discriminacao do servico.',
  publicado: false,
  variantes: ['RPS invalido ou incompleto'],
  versoesProvedorIds: [5],
  camposLayoutIds: [3],
  versaoConcorrencia: 31,
}

export const artigoAdminDto = {
  id: 23,
  slug: 'migrar-para-abrasf-204',
  tipo: 'Mudanca',
  titulo: 'Migrar para ABRASF 2.04',
  corpo: '## Antes de comecar',
  publicado: false,
  reservado: false,
  verificadoEm: null,
  campoLayoutIds: [3],
  erroIds: [17],
  erros: [{ id: 17, codigo: 'E0117', titulo: 'RPS invalido', desativado: false }],
  camposLayout: [
    {
      id: 3,
      nome: 'Discriminacao',
      caminhoXml: 'Rps/Discriminacao',
      versaoLayoutId: 2,
      versaoLayoutRotulo: '8',
      desativado: false,
    },
  ],
  versaoConcorrencia: 15,
}

export const comunicadoAdminDto = {
  id: 61,
  titulo: 'Janela de manutencao',
  corpo: 'O emissor fica fora do ar no domingo de madrugada.',
  severidade: 'Alerta',
  abrangencia: 'Global',
  provedorId: null,
  provedorNome: null,
  versaoProvedorId: null,
  versaoRotulo: null,
  expiraEm: '2026-12-31T23:59:00-03:00',
  publicado: false,
  encerrado: false,
  versaoConcorrencia: 2,
}

export const exemploAdminDto = {
  id: 71,
  versaoProvedorId: 5,
  slug: 'rps-minimo',
  nome: 'RPS minimo',
  descricao: null,
  xml: '<Rps><Discriminacao>Servico prestado</Discriminacao></Rps>',
  versaoConcorrencia: 1,
}
