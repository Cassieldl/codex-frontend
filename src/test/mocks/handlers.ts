import { HttpResponse, http } from 'msw'
import type { HttpHandler } from 'msw'

/**
 * Handlers base do MSW, compartilhados por toda a suíte. Cada feature
 * acrescenta os próprios handlers replicando o envelope real da API
 * (AP-ARQUITETURA-001 - `ApiResponse<T>` vs `PaginatedResponse<T>` cru,
 * conforme `analise-frontend.md` §5.4), seja aqui ou via `server.use(...)`
 * dentro do próprio arquivo de teste.
 *
 * O único handler de base é o dos comunicados do contexto: a página do provedor, a da versão e a do
 * erro sempre o consultam, e quem testa outra coisa nelas não deve declará-lo. Os testes que tratam
 * de comunicado o sobrescrevem com `server.use(...)`.
 */
const API_URL = import.meta.env.VITE_API_URL

export const handlers: HttpHandler[] = [
  http.get(`${API_URL}/comunicados`, () => HttpResponse.json({ data: [] })),
  // A página da versão sempre consulta o envio modelo. A base responde "sem estrutura", que fica
  // contido na seção; os testes do envio modelo sobrescrevem.
  http.get(`${API_URL}/provedores/:provedorSlug/versoes/:versaoSlug/envio-modelo`, () =>
    HttpResponse.json(
      { error: { code: 'ESTRUTURA_INDISPONIVEL', message: 'Estrutura indisponível.' } },
      { status: 404 },
    ),
  ),
]

/**
 * Resposta padrão de `GET /busca` (P1), já no shape pós-P1/I21 -
 * `descricaoCasamento`/`publicado`/`meta` vivem no item, nunca no grupo (ver
 * `features/busca/types/resultadoBusca.ts`). Uso opcional via
 * `server.use(handlerBuscaVazia())`, para quem só precisa de uma resposta
 * válida sem repetir o envelope inteiro - não é registrado em `handlers` por
 * padrão, para não mudar o comportamento de nenhum teste que já monta o
 * próprio `server.use(...)` (disciplina atual do arquivo).
 */
export function handlerBuscaVazia(): HttpHandler {
  const resultado = {
    termo: '',
    termoUsado: '',
    correcao: null,
    qualidade: 'vazia',
    totalGeral: 0,
    grupos: [],
    foraDoFiltro: null,
    filtroProvedor: null,
  }

  return http.get(`${API_URL}/busca`, () => HttpResponse.json({ data: resultado, message: null }))
}

/**
 * Resposta padrão de `GET /erros/:slug` (P6), incluindo
 * `artigosRelacionados: []` - coleção vazia, nunca omitida (PQ-08). O tipo
 * `ErroDetalhe` ainda não declara este campo nesta unidade (FRONT-B
 * acrescenta, `analise-frontend.md` §5) - o handler já responde com o shape
 * final para não exigir retrabalho quando o tipo for estendido.
 */
export function handlerErroDetalhePadrao(slug = 'e0117'): HttpHandler {
  return http.get(`${API_URL}/erros/${slug}`, () =>
    HttpResponse.json({
      data: {
        slug,
        codigo: slug.toUpperCase(),
        origem: 'Schema',
        titulo: `Erro ${slug}`,
        variantes: [],
        causaProvavel: null,
        solucaoSugerida: null,
        versoesAplicaveis: [],
        camposRelacionados: [],
        artigosRelacionados: [],
      },
      message: null,
    }),
  )
}

/**
 * Bloco FRONT-B: P7/P8 (artigos públicos). `GET /artigos` é
 * `PaginatedResponse<T>` **cru** e `GET /artigos/{slug}` é `ApiResponse<T>`
 * **enveloped**: os dois envelopes convivem no mesmo recurso, medidos no wire
 * real do backend. Replicar cada um como ele é aqui é o que impede que um
 * teste passe contra um mock "conveniente" (AP-ARQUITETURA-001).
 */
export function handlerArtigosLista(
  items: object[],
  extras: Partial<{ totalCount: number; page: number; pageSize: number; totalPages: number }> = {},
): HttpHandler {
  return http.get(`${API_URL}/artigos`, () =>
    HttpResponse.json({
      items,
      totalCount: items.length,
      page: 1,
      pageSize: 25,
      totalPages: Math.max(1, Math.ceil(items.length / 25)),
      ...extras,
    }),
  )
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- o genérico livra a fixture literal da checagem de propriedade excedente
export function handlerArtigoDetalhe<Artigo extends { slug: string }>(artigo: Artigo): HttpHandler {
  return http.get(`${API_URL}/artigos/${artigo.slug}`, () =>
    HttpResponse.json({ data: artigo, message: null }),
  )
}

/**
 * Bloco FRONT-C1: I30/I31 (comunicados internos). Os dois envelopes do
 * recurso, como estão no wire real: **I30 é `PaginatedResponse<T>` cru na
 * raiz** e **I31 (e as respostas de I32/I33/I35) vêm enveloped em `data`**.
 * Reproduzi-los como são aqui é o que impede um teste de passar contra um
 * mock conveniente (AP-ARQUITETURA-001).
 *
 * Nenhum item carrega `etag`: o backend nunca devolveu esse campo no corpo - o
 * valor do `If-Match` é DERIVADO de `versaoConcorrencia` pelo hook de leitura.
 */
export function handlerComunicadosLista(
  items: object[],
  extras: Partial<{ totalCount: number; page: number; pageSize: number; totalPages: number }> = {},
): HttpHandler {
  return http.get(`${API_URL}/interno/comunicados`, () =>
    HttpResponse.json({
      items,
      totalCount: items.length,
      page: 1,
      pageSize: 25,
      totalPages: Math.max(1, Math.ceil(items.length / 25)),
      ...extras,
    }),
  )
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- o genérico livra a fixture literal da checagem de propriedade excedente
export function handlerComunicadoDetalhe<Comunicado extends { id: number }>(
  comunicado: Comunicado,
): HttpHandler {
  return http.get(`${API_URL}/interno/comunicados/${comunicado.id}`, () =>
    HttpResponse.json({ data: comunicado, message: null }),
  )
}

/**
 * Bloco FRONT-C2: I23/I24/I36 (artigos internos). O recurso tem os **dois**
 * envelopes no wire real: **I23 é `PaginatedResponse<T>` cru na raiz**,
 * enquanto **I24 e I36 vêm enveloped em `data`**. Replicar cada um como ele é
 * aqui é o que impede um teste de passar contra um mock conveniente
 * (AP-ARQUITETURA-001).
 *
 * Nenhum item carrega `etag`: o backend nunca devolveu esse campo no corpo - o
 * valor do `If-Match` é DERIVADO de `versaoConcorrencia` pelo hook de leitura.
 */
export function handlerArtigosAdminLista(
  items: object[],
  extras: Partial<{ totalCount: number; page: number; pageSize: number; totalPages: number }> = {},
): HttpHandler {
  return http.get(`${API_URL}/interno/artigos`, () =>
    HttpResponse.json({
      items,
      totalCount: items.length,
      page: 1,
      pageSize: 25,
      totalPages: Math.max(1, Math.ceil(items.length / 25)),
      ...extras,
    }),
  )
}

/** O corpo vem como JSON literal do `ArtigoAdminDto`, sem o tipo do cliente: o teste confere o contrato. */
export function handlerArtigoAdminDetalhe(id: number, corpo: Record<string, unknown>): HttpHandler {
  return http.get(`${API_URL}/interno/artigos/${id}`, () =>
    HttpResponse.json({ data: corpo, message: null }),
  )
}

// Corpos transcritos dos DTOs sem tipo do cliente: anotar faria o teste confirmar a crença, não o contrato.
export function handlerHomeSucesso(overrides: object = {}): HttpHandler {
  const home = {
    comunicados: [],
    provedoresPorCategoria: [],
    layout: null,
    artigosRecentes: [],
    ...overrides,
  }

  return http.get(`${API_URL}/home`, () => HttpResponse.json({ data: home, message: null }))
}

export function handlerLayoutIndiceSucesso(overrides: object = {}): HttpHandler {
  const indice = {
    vigente: null,
    versoes: [],
    ...overrides,
  }

  return http.get(`${API_URL}/layout`, () => HttpResponse.json({ data: indice, message: null }))
}

export function handlerLayoutVersaoSucesso(
  versaoSlug: string,
  overrides: object = {},
): HttpHandler {
  const pagina = {
    versao: {
      slug: versaoSlug,
      rotulo: versaoSlug,
      estado: 'Vigente',
      ordem: 1,
      totalCampos: 0,
    },
    descricao: null,
    anterior: null,
    totalCampos: 0,
    camposPorGrupo: [],
    ...overrides,
  }

  return http.get(`${API_URL}/layout/versoes/${versaoSlug}`, () =>
    HttpResponse.json({ data: pagina, message: null }),
  )
}

export function handlerCampoLayoutVerbeteSucesso(
  campoSlug: string,
  overrides: object = {},
): HttpHandler {
  const verbete = {
    slug: campoSlug,
    nome: campoSlug,
    caminhoXml: `Rps/${campoSlug}`,
    significado: `Significado de ${campoSlug}`,
    estado: 'Ativo',
    versaoExibicao: { slug: 'v1', rotulo: 'Versão 1', estado: 'Vigente', ordem: 1, totalCampos: 1 },
    versaoOrigem: { slug: 'v1', rotulo: 'Versão 1', estado: 'Vigente', ordem: 1, totalCampos: 1 },
    versaoDescontinuado: null,
    ondeEUsado: [],
    ...overrides,
  }

  return http.get(`${API_URL}/layout/campos/${campoSlug}`, () =>
    HttpResponse.json({ data: verbete, message: null }),
  )
}

/**
 * I36: existência por slug. A rota é mais específica que `/interno/artigos/{id}`
 * na intenção, mas `existe` não casa com `{id:int}` no backend; no MSW as duas
 * convivem porque os caminhos são literais distintos.
 */
export function handlerArtigoExiste(slug: string, artigoId: number | null): HttpHandler {
  return http.get(`${API_URL}/interno/artigos/existe`, () =>
    HttpResponse.json({
      data: { slug, existe: artigoId !== null, artigoId },
      message: null,
    }),
  )
}

/**
 * Bloco FRONT-C: desfechos de P11/P12 que a tela 6 precisa tratar e que os
 * handlers de sucesso de FRONT-A não cobrem. Os erros replicam o envelope real
 * de erro da API (`{ error: { code, message } }`), e o `code` **importa**: é
 * ele que distingue as duas causas do `410` de P12 (o campo saiu do ar × o
 * campo existe mas nenhuma versão publicada o exibe).
 */
export function handlerLayoutVersaoDespublicada(versaoSlug: string): HttpHandler {
  return http.get(`${API_URL}/layout/versoes/${versaoSlug}`, () =>
    HttpResponse.json(
      {
        error: {
          code: 'VERSAO_LAYOUT_DESPUBLICADA',
          message: 'Esta versão do Layout InvoiCy saiu do ar.',
        },
      },
      { status: 410 },
    ),
  )
}

/** `422` do cap de campos por versão (PQ-10) - limite estrutural, não falha transitória. */
export function handlerLayoutVersaoCapExcedido(versaoSlug: string): HttpHandler {
  return http.get(`${API_URL}/layout/versoes/${versaoSlug}`, () =>
    HttpResponse.json(
      {
        error: {
          code: 'LIMITE_CAMPOS_EXCEDIDO',
          message: 'Esta versão tem mais campos do que o agregado suporta.',
        },
      },
      { status: 422 },
    ),
  )
}

export function handlerCampoLayoutDespublicado(
  campoSlug: string,
  codigo: 'CAMPO_LAYOUT_DESPUBLICADO' | 'VERSAO_LAYOUT_DESPUBLICADA' = 'VERSAO_LAYOUT_DESPUBLICADA',
): HttpHandler {
  return http.get(`${API_URL}/layout/campos/${campoSlug}`, () =>
    HttpResponse.json(
      { error: { code: codigo, message: 'Este verbete não está mais publicado.' } },
      { status: 410 },
    ),
  )
}

/**
 * Campos de uma versão densa. `urlCanonica` é derivada do slug **pelo
 * backend** - quem constrói fixture nunca deve assumir que ela é
 * `/layout/campos/{slug}` montado à mão (A3: a fonte única é o campo).
 */
export function construirCamposLayout(
  quantidade: number,
  prefixo = 'campo',
  overrides: object = {},
) {
  return Array.from({ length: quantidade }, (_, indice) => ({
    slug: `${prefixo}-${indice + 1}`,
    nome: `Campo ${indice + 1}`,
    caminhoXml: `Nfse/Rps/Campo${indice + 1}`,
    significado: `Significado do campo ${indice + 1}.`,
    ordem: indice + 1,
    reformaTributaria: false,
    novoNestaVersao: false,
    descontinuadoNestaVersao: false,
    urlCanonica: `/layout/campos/${prefixo}-${indice + 1}`,
    ...overrides,
  }))
}

export function construirGrupoCamposLayout(grupo: string, grupoSlug: string, campos: object[]) {
  return { grupo, grupoSlug, campos }
}

/**
 * Bloco FRONT-B: desfechos de P9 (Home) que o handler de sucesso de FRONT-A
 * não cobre. Sucesso com conteúdo continua vindo de `handlerHomeSucesso`.
 */
export function handlerHomeErro(status = 500): HttpHandler {
  return http.get(`${API_URL}/home`, () =>
    HttpResponse.json(
      { error: { code: 'ERRO_INTERNO', message: 'Não foi possível montar a página inicial.' } },
      { status },
    ),
  )
}

/**
 * P9 respondendo com o **envelope do vizinho**: o corpo cru na raiz, como as
 * listagens públicas (`GET /provedores`, `GET /artigos`) de fato respondem.
 *
 * Existe para um teste de falha deliberado: `useHome` lê `ApiResponse<T>`
 * (enveloped em `data`), então contra este handler a leitura **tem** de vir
 * vazia. Sem isso, "o hook casa com o contrato" seria só uma coincidência
 * entre dois arquivos escritos pela mesma pessoa no mesmo dia
 * (AP-ARQUITETURA-001).
 */
export function handlerHomeCruSemEnvelope(home: object): HttpHandler {
  return http.get(`${API_URL}/home`, () => HttpResponse.json(home))
}
