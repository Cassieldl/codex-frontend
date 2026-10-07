import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  COMUNICADO_CRITICO_DO_PROVEDOR,
  COMUNICADO_GLOBAL,
  handlerComunicadosRegistrandoChamadas,
} from '../../../test/mocks/comunicadosContexto'
import { server } from '../../../test/mocks/server'
import { comunicadosKeys } from './comunicadosKeys'
import { useComunicadosDoContexto } from './useComunicadosDoContexto'

const API_URL = import.meta.env.VITE_API_URL

function envolverComQueryClient(queryClient = new QueryClient()) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useComunicadosDoContexto', () => {
  it('lê o envelope `data` e devolve os comunicados na ordem do servidor', async () => {
    const { handler } = handlerComunicadosRegistrandoChamadas([
      COMUNICADO_CRITICO_DO_PROVEDOR,
      COMUNICADO_GLOBAL,
    ])
    server.use(handler)

    const { result } = renderHook(() => useComunicadosDoContexto({ provedorSlugs: ['x'] }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((comunicado) => comunicado.id)).toEqual([2, 1])
  })

  it('falha nomeando a coleção quando a resposta vem crua, sem o envelope `data`', async () => {
    server.use(
      http.get(`${API_URL}/comunicados`, () => HttpResponse.json([COMUNICADO_CRITICO_DO_PROVEDOR])),
    )

    const { result } = renderHook(() => useComunicadosDoContexto({ provedorSlugs: ['x'] }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('"comunicados"')
  })

  it('um provedor: manda `provedor=<slug>` e nenhuma versão', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handler)

    const { result } = renderHook(
      () => useComunicadosDoContexto({ provedorSlugs: ['prefeitura-exemplo'] }),
      { wrapper: envolverComQueryClient() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]!.search).toBe('?provedor=prefeitura-exemplo')
  })

  it('provedor e versão: manda os dois', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handler)

    const { result } = renderHook(
      () => useComunicadosDoContexto({ provedorSlugs: ['prefeitura-exemplo'], versaoSlug: '2-04' }),
      { wrapper: envolverComQueryClient() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chamadas[0]!.searchParams.get('provedor')).toBe('prefeitura-exemplo')
    expect(chamadas[0]!.searchParams.get('versao')).toBe('2-04')
  })

  it('vários provedores: repete `provedor`, no formato que o servidor lê', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handler)

    const { result } = renderHook(() => useComunicadosDoContexto({ provedorSlugs: ['a', 'b'] }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chamadas[0]!.search).toBe('?provedor=a&provedor=b')
  })

  it('sem provedor: nenhum parâmetro (o servidor devolve só os globais)', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([COMUNICADO_GLOBAL])
    server.use(handler)

    const { result } = renderHook(() => useComunicadosDoContexto({ provedorSlugs: [] }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chamadas[0]!.search).toBe('')
  })

  it('mais de 10 provedores: manda os 10 primeiros distintos', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handler)
    const slugs = [...Array.from({ length: 12 }, (_, indice) => `p-${indice + 1}`), 'p-1']

    const { result } = renderHook(() => useComunicadosDoContexto({ provedorSlugs: slugs }), {
      wrapper: envolverComQueryClient(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chamadas[0]!.searchParams.getAll('provedor')).toEqual(slugs.slice(0, 10))
  })

  it('versão com mais de um provedor: não manda a versão (o servidor responderia 400)', async () => {
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handler)

    const { result } = renderHook(
      () => useComunicadosDoContexto({ provedorSlugs: ['a', 'b'], versaoSlug: '2-04' }),
      { wrapper: envolverComQueryClient() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chamadas[0]!.searchParams.has('versao')).toBe(false)
  })

  it('cada contexto tem a própria entrada de cache', async () => {
    const queryClient = new QueryClient()
    const { handler } = handlerComunicadosRegistrandoChamadas([])
    server.use(handler)

    const { result } = renderHook(
      () => useComunicadosDoContexto({ provedorSlugs: ['a'], versaoSlug: 'v1' }),
      { wrapper: envolverComQueryClient(queryClient) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(comunicadosKeys.contexto(['a'], 'v1'))).toEqual([])
    expect(queryClient.getQueryData(comunicadosKeys.contexto(['a'], null))).toBeUndefined()
  })

  it('cache com mais de um minuto é refeito ao montar: o comunicado vence com o tempo', async () => {
    const queryClient = new QueryClient()
    const { handler, chamadas } = handlerComunicadosRegistrandoChamadas([])
    server.use(handler)
    const UM_MINUTO_E_UM_SEGUNDO_MS = 61_000
    queryClient.setQueryData(comunicadosKeys.contexto(['a'], null), [COMUNICADO_GLOBAL], {
      updatedAt: Date.now() - UM_MINUTO_E_UM_SEGUNDO_MS,
    })

    const { result } = renderHook(() => useComunicadosDoContexto({ provedorSlugs: ['a'] }), {
      wrapper: envolverComQueryClient(queryClient),
    })

    await waitFor(() => expect(chamadas).toHaveLength(1))
    await waitFor(() => expect(result.current.data).toEqual([]))
  })
})
