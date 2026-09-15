import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useAtualizarComunicado } from './useAtualizarComunicado'
import { useComunicadoAdminPorId } from './useComunicadoAdminPorId'
import { useRemoverComunicado } from './useRemoverComunicado'
import { usePublicarComunicado } from './usePublicarComunicado'

const API_URL = import.meta.env.VITE_API_URL

/** Corpo de `GET /interno/comunicados/{id}` (I31) — enveloped, com `versaoConcorrencia` e sem `etag`. */
const detalheDoServidor = {
  id: 77,
  titulo: 'Manutenção programada',
  corpo: 'A prefeitura ficará indisponível no domingo.',
  severidade: 'Informativo',
  abrangencia: 'ProvedorVersao',
  provedorId: 4,
  provedorNome: 'Prefeitura de Exemplo',
  versaoProvedorId: 9,
  versaoRotulo: 'ABRASF 2.04',
  expiraEm: '2099-05-20T09:00:00+00:00',
  publicado: true,
  encerrado: false,
  versaoConcorrencia: 31,
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('escrita de comunicado — If-Match derivado da leitura (I31 → I33/I34/I35)', () => {
  it('I31 traz corpo e os ids brutos de escopo, e deriva o etag do versaoConcorrencia', async () => {
    server.use(
      http.get(`${API_URL}/interno/comunicados/77`, () =>
        HttpResponse.json({ data: detalheDoServidor, message: null }),
      ),
    )

    const { result } = renderHook(() => useComunicadoAdminPorId(77), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Os três campos que a listagem NÃO tem — sem eles o modal abre vazio.
    expect(result.current.data?.corpo).toBe('A prefeitura ficará indisponível no domingo.')
    expect(result.current.data?.provedorId).toBe(4)
    expect(result.current.data?.versaoProvedorId).toBe(9)
    expect(result.current.data?.etag).toBe(`W/"${detalheDoServidor.versaoConcorrencia}"`)
  })

  it('não busca detalhe enquanto nenhum comunicado está aberto', () => {
    // Sem handler registrado: qualquer requisição derrubaria o teste
    // (`onUnhandledRequest: 'error'` no setup da suíte).
    const { result } = renderHook(() => useComunicadoAdminPorId(null), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('atualizar, remover e publicar mandam o If-Match que veio do detalhe', async () => {
    const capturado: Record<string, string | null> = { put: null, del: null, pub: null }
    server.use(
      http.get(`${API_URL}/interno/comunicados/77`, () =>
        HttpResponse.json({ data: detalheDoServidor, message: null }),
      ),
      http.put(`${API_URL}/interno/comunicados/77`, ({ request }) => {
        capturado.put = request.headers.get('If-Match')
        return HttpResponse.json({ data: detalheDoServidor, message: null })
      }),
      http.delete(`${API_URL}/interno/comunicados/77`, ({ request }) => {
        capturado.del = request.headers.get('If-Match')
        return new HttpResponse(null, { status: 204 })
      }),
      http.put(`${API_URL}/interno/comunicados/77/publicacao`, ({ request }) => {
        capturado.pub = request.headers.get('If-Match')
        return HttpResponse.json({ data: detalheDoServidor, message: null })
      }),
    )

    const queryClient = novoQueryClient()
    const { result } = renderHook(
      () => ({
        detalhe: useComunicadoAdminPorId(77),
        atualizar: useAtualizarComunicado(),
        remover: useRemoverComunicado(),
        publicar: usePublicarComunicado(),
      }),
      { wrapper: criarWrapper(queryClient) },
    )

    await waitFor(() => expect(result.current.detalhe.isSuccess).toBe(true))

    const comunicado = result.current.detalhe.data
    expect(comunicado).toBeDefined()

    await act(async () => {
      await result.current.atualizar.mutateAsync({
        id: comunicado!.id,
        dto: {
          titulo: comunicado!.titulo,
          corpo: comunicado!.corpo,
          severidade: comunicado!.severidade,
          abrangencia: comunicado!.abrangencia,
          provedorId: comunicado!.provedorId ?? undefined,
          versaoProvedorId: comunicado!.versaoProvedorId ?? undefined,
          expiraEm: comunicado!.expiraEm,
        },
        etag: comunicado!.etag,
      })
      await result.current.publicar.mutateAsync({
        id: comunicado!.id,
        publicado: false,
        etag: comunicado!.etag,
      })
      await result.current.remover.mutateAsync({ id: comunicado!.id, etag: comunicado!.etag })
    })

    expect(capturado.put).toBe('W/"31"')
    expect(capturado.pub).toBe('W/"31"')
    expect(capturado.del).toBe('W/"31"')
  })

  it('publicar manda só { publicado } no corpo — nenhum outro campo do comunicado', async () => {
    const capturado: { corpo: unknown } = { corpo: null }
    server.use(
      http.put(`${API_URL}/interno/comunicados/77/publicacao`, async ({ request }) => {
        capturado.corpo = await request.json()
        return HttpResponse.json({ data: detalheDoServidor, message: null })
      }),
    )

    const { result } = renderHook(() => usePublicarComunicado(), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    await act(async () => {
      await result.current.mutateAsync({ id: 77, publicado: true, etag: 'W/"31"' })
    })

    expect(capturado.corpo).toEqual({ publicado: true })
  })

  it('o 422 COMUNICADO_EXPIRADO de I35 sobe cru para a página decidir a UX', async () => {
    const mensagemDoBackend =
      'Não é possível publicar um comunicado cuja expiração já passou. Edite o comunicado para estender a data de expiração para o futuro e publique em seguida.'
    server.use(
      http.put(`${API_URL}/interno/comunicados/77/publicacao`, () =>
        HttpResponse.json(
          { error: { code: 'COMUNICADO_EXPIRADO', message: mensagemDoBackend } },
          { status: 422 },
        ),
      ),
    )

    const { result } = renderHook(() => usePublicarComunicado(), {
      wrapper: criarWrapper(novoQueryClient()),
    })

    // O hook não traduz nem engole o erro: status, código e mensagem chegam
    // inteiros a quem chamou, porque é a página que monta a recuperação.
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 77, publicado: true, etag: 'W/"31"' }),
      ).rejects.toMatchObject({
        response: {
          status: 422,
          data: { error: { code: 'COMUNICADO_EXPIRADO', message: mensagemDoBackend } },
        },
      })
    })
  })
})
