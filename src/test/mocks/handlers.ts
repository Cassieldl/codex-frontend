import { HttpResponse, http } from 'msw'
import type { HttpHandler } from 'msw'
import type { ArtigoDetalhe, ArtigoListaItem } from '../../features/artigos/types/artigo'
import type { PaginaDeArtigos } from '../../features/artigos/hooks/useArtigos'
import type { ResultadoBusca } from '../../features/busca/types/resultadoBusca'
import type {
  ComunicadoAdminDetalhe,
  ComunicadoAdminListaItem,
} from '../../features/interno/comunicados/types/comunicadoAdmin'
import type {
  ArtigoAdminDetalhe,
  ArtigoAdminListaItem,
} from '../../features/interno/artigos/types/artigoAdmin'

/**
 * Handlers base do MSW, compartilhados por toda a suíte. Cada feature
 * acrescenta os próprios handlers replicando o envelope real da API
 * (AP-ARQUITETURA-001 — `ApiResponse<T>` vs `PaginatedResponse<T>` cru,
 * conforme `analise-frontend.md` §5.4), seja aqui ou via `server.use(...)`
 * dentro do próprio arquivo de teste.
 */
export const handlers: HttpHandler[] = []

const API_URL = import.meta.env.VITE_API_URL

/**
 * Resposta padrão de `GET /busca` (P1), já no shape pós-P1/I21 —
 * `descricaoCasamento`/`publicado`/`meta` vivem no item, nunca no grupo (ver
 * `features/busca/types/resultadoBusca.ts`). Uso opcional via
 * `server.use(handlerBuscaVazia())`, para quem só precisa de uma resposta
 * válida sem repetir o envelope inteiro — não é registrado em `handlers` por
 * padrão, para não mudar o comportamento de nenhum teste que já monta o
 * próprio `server.use(...)` (disciplina atual do arquivo).
 */
export function handlerBuscaVazia(): HttpHandler {
  const resultado: ResultadoBusca = {
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
 * `artigosRelacionados: []` — coleção vazia, nunca omitida (PQ-08). O tipo
 * `ErroDetalhe` ainda não declara este campo nesta unidade (FRONT-B
 * acrescenta, `analise-frontend.md` §5) — o handler já responde com o shape
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
 * Bloco FRONT-B — P7/P8 (artigos públicos). `GET /artigos` é
 * `PaginatedResponse<T>` **cru** e `GET /artigos/{slug}` é `ApiResponse<T>`
 * **enveloped**: os dois envelopes convivem no mesmo recurso, medidos no wire
 * real do backend. Replicar cada um como ele é aqui é o que impede que um
 * teste passe contra um mock "conveniente" (AP-ARQUITETURA-001).
 */
export function handlerArtigosLista(
  items: ArtigoListaItem[],
  extras: Partial<Omit<PaginaDeArtigos, 'items'>> = {},
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

export function handlerArtigoDetalhe(artigo: ArtigoDetalhe): HttpHandler {
  return http.get(`${API_URL}/artigos/${artigo.slug}`, () =>
    HttpResponse.json({ data: artigo, message: null }),
  )
}

/**
 * Bloco FRONT-C1 — I30/I31 (comunicados internos). Os dois envelopes do
 * recurso, como estão no wire real: **I30 é `PaginatedResponse<T>` cru na
 * raiz** e **I31 (e as respostas de I32/I33/I35) vêm enveloped em `data`**.
 * Reproduzi-los como são aqui é o que impede um teste de passar contra um
 * mock conveniente (AP-ARQUITETURA-001).
 *
 * Nenhum item carrega `etag`: o backend nunca devolveu esse campo no corpo — o
 * valor do `If-Match` é DERIVADO de `versaoConcorrencia` pelo hook de leitura.
 */
export function handlerComunicadosLista(
  items: ComunicadoAdminListaItem[],
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

export function handlerComunicadoDetalhe(comunicado: ComunicadoAdminDetalhe): HttpHandler {
  return http.get(`${API_URL}/interno/comunicados/${comunicado.id}`, () =>
    HttpResponse.json({ data: comunicado, message: null }),
  )
}

/**
 * Bloco FRONT-C2 — I23/I24/I36 (artigos internos). O recurso tem os **dois**
 * envelopes no wire real: **I23 é `PaginatedResponse<T>` cru na raiz**,
 * enquanto **I24 e I36 vêm enveloped em `data`**. Replicar cada um como ele é
 * aqui é o que impede um teste de passar contra um mock conveniente
 * (AP-ARQUITETURA-001).
 *
 * Nenhum item carrega `etag`: o backend nunca devolveu esse campo no corpo — o
 * valor do `If-Match` é DERIVADO de `versaoConcorrencia` pelo hook de leitura.
 */
export function handlerArtigosAdminLista(
  items: ArtigoAdminListaItem[],
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

export function handlerArtigoAdminDetalhe(artigo: ArtigoAdminDetalhe): HttpHandler {
  return http.get(`${API_URL}/interno/artigos/${artigo.id}`, () =>
    HttpResponse.json({ data: artigo, message: null }),
  )
}

/**
 * I36 — existência por slug. A rota é mais específica que `/interno/artigos/{id}`
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
