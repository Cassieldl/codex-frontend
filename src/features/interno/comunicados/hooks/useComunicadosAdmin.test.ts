import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useComunicadosAdmin } from './useComunicadosAdmin'

const API_URL = import.meta.env.VITE_API_URL

/**
 * Corpo REAL de `GET /interno/comunicados` (I30): `PaginatedResponse<T>` **cru
 * na raiz**, sem envelope `data`. Cada item traz `versaoConcorrencia` e nenhum
 * `etag` — nenhum literal `W/"…"` aparece aqui de propósito, o valor esperado
 * no `If-Match` tem de ser DERIVADO.
 *
 * As três combinações de `publicado`/`encerrado` que a visão padrão
 * (`incluirEncerrados=false`) pode devolver estão representadas: o backend
 * esconde só o que ENCERROU, nunca o que está em rascunho.
 */
const respostaVisaoPadrao = {
  items: [
    {
      id: 11,
      titulo: 'Rascunho ainda vigente',
      severidade: 'Alerta',
      abrangencia: 'Global',
      provedorNome: null,
      versaoRotulo: null,
      expiraEm: '2099-01-10T12:00:00+00:00',
      publicado: false,
      encerrado: false,
      versaoConcorrencia: 3,
    },
    {
      id: 12,
      titulo: 'Publicado e vigente',
      severidade: 'Critico',
      abrangencia: 'Provedor',
      provedorNome: 'Prefeitura de Exemplo',
      versaoRotulo: null,
      expiraEm: '2099-01-09T12:00:00+00:00',
      publicado: true,
      encerrado: false,
      versaoConcorrencia: 5,
    },
  ],
  totalCount: 2,
  page: 1,
  pageSize: 25,
  totalPages: 1,
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('useComunicadosAdmin (I30)', () => {
  it('envia os filtros da tela como query params, incluindo incluirEncerrados=false', async () => {
    const capturado: { url: URL | null } = { url: null }
    server.use(
      http.get(`${API_URL}/interno/comunicados`, ({ request }) => {
        capturado.url = new URL(request.url)
        return HttpResponse.json(respostaVisaoPadrao)
      }),
    )

    const { result } = renderHook(
      () =>
        useComunicadosAdmin({
          severidade: 'Critico',
          incluirEncerrados: false,
          pagina: 2,
          tamanhoPagina: 50,
        }),
      { wrapper: criarWrapper(novoQueryClient()) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturado.url?.searchParams.get('severidade')).toBe('Critico')
    expect(capturado.url?.searchParams.get('incluirEncerrados')).toBe('false')
    expect(capturado.url?.searchParams.get('pagina')).toBe('2')
    expect(capturado.url?.searchParams.get('tamanhoPagina')).toBe('50')
  })

  it('a visão padrão entrega o rascunho vigente intacto — o filtro esconde só o encerrado', async () => {
    server.use(
      http.get(`${API_URL}/interno/comunicados`, () => HttpResponse.json(respostaVisaoPadrao)),
    )

    const { result } = renderHook(() => useComunicadosAdmin({ incluirEncerrados: false }), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Guarda de vacuidade antes das asserções de conteúdo.
    expect(result.current.data?.items).toHaveLength(2)

    const rascunho = result.current.data?.items.find((item) => item.id === 11)
    expect(rascunho?.publicado).toBe(false)
    expect(rascunho?.encerrado).toBe(false)
    expect(rascunho?.titulo).toBe('Rascunho ainda vigente')
  })

  it('deriva o etag de cada item do versaoConcorrencia do corpo', async () => {
    server.use(
      http.get(`${API_URL}/interno/comunicados`, () => HttpResponse.json(respostaVisaoPadrao)),
    )

    const { result } = renderHook(() => useComunicadosAdmin({ pagina: 1 }), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.items).toHaveLength(2)
    expect(result.current.data?.items[0].etag).toBe(
      `W/"${respostaVisaoPadrao.items[0].versaoConcorrencia}"`,
    )
    expect(result.current.data?.items[1].etag).toBe(
      `W/"${respostaVisaoPadrao.items[1].versaoConcorrencia}"`,
    )
  })

  it('o corpo real não tem campo etag — o valor é derivado, nunca repassado', () => {
    expect(respostaVisaoPadrao.items).not.toHaveLength(0)
    for (const item of respostaVisaoPadrao.items) {
      expect(item).not.toHaveProperty('etag')
    }
  })

  it('lê o corpo CRU na raiz — envelope { data } de I31-I35 não se aplica a I30', async () => {
    server.use(
      http.get(`${API_URL}/interno/comunicados`, () =>
        HttpResponse.json({ data: respostaVisaoPadrao, message: null }),
      ),
    )

    const { result } = renderHook(() => useComunicadosAdmin({ pagina: 1 }), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    // Enveloped, a leitura crua não acha `items` e a query falha — é a prova de
    // que o hook está casado com o envelope certo do endpoint certo.
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
