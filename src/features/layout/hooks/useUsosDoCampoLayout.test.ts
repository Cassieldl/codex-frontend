import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/mocks/server'
import { layoutKeys } from './layoutKeys'
import { useSlugAssentadoDoCampo, useUsosDoCampoLayout } from './useUsosDoCampoLayout'

const API_URL = import.meta.env.VITE_API_URL

/** Os usos de `ondeEUsado`, em JSON literal com as 6 chaves de `UsoCampoLayoutDto`. */
const USO_COM_DOIS_DESTINOS = {
  provedorSlug: 'iss-net',
  provedorNome: 'ISS.NET',
  versaoSlug: '2-04',
  versaoRotulo: '2.04',
  destinoXml: 'DPS/infDPS/serv/vServ | DPS/infDPS/serv/vServPrest',
  estadoPreenchimento: 'Obrigatorio',
}

const USO_SEM_DESTINO = {
  provedorSlug: 'abrasf',
  provedorNome: 'ABRASF',
  versaoSlug: '2-03',
  versaoRotulo: '2.03',
  destinoXml: null,
  estadoPreenchimento: 'Opcional',
}

const USO_COM_DESTINOS_OMITIDOS = {
  provedorSlug: 'abrasf',
  provedorNome: 'ABRASF',
  versaoSlug: '2-04',
  versaoRotulo: '2.04',
  destinoXml: 'Servico/Valores/ValorServicos | …',
  estadoPreenchimento: 'Condicional',
}

function verbeteDoCampo(slug: string, ondeEUsado: unknown) {
  return {
    slug,
    nome: `Campo ${slug}`,
    caminhoXml: `Nfse/${slug}`,
    significado: `Significado de ${slug}`,
    estado: 'Ativo',
    versaoExibicao: { slug: '8', rotulo: '8' },
    versaoOrigem: { slug: '8', rotulo: '8' },
    versaoDescontinuado: null,
    ondeEUsado,
  }
}

/** Os dois hooks juntos, como o modal os usa: o atraso mora fora do conteúdo que remonta. */
function usarUsosDoCampo(campoSlug: string) {
  return useUsosDoCampoLayout(campoSlug, useSlugAssentadoDoCampo(campoSlug))
}

function criarCliente() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function envolver(cliente: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: cliente }, children)
}

/** Responde P12 com os usos de cada slug e devolve a lista, em ordem, dos slugs requisitados. */
function responderUsos(usosPorSlug: Record<string, unknown[]>): string[] {
  const requisitados: string[] = []

  server.use(
    http.get(`${API_URL}/layout/campos/:campoSlug`, ({ params }) => {
      const slug = String(params.campoSlug)
      requisitados.push(slug)
      return HttpResponse.json({
        data: verbeteDoCampo(slug, usosPorSlug[slug] ?? []),
        message: null,
      })
    }),
  )

  return requisitados
}

function responderVerbeteComOndeEUsado(ondeEUsado: unknown) {
  server.use(
    http.get(`${API_URL}/layout/campos/valor-servicos`, () =>
      HttpResponse.json({ data: verbeteDoCampo('valor-servicos', ondeEUsado), message: null }),
    ),
  )
}

function mensagemDoErro(cliente: QueryClient, slug: string): string | undefined {
  // O erro do `select` mora no resultado do observador, não no estado da query.
  const consulta = cliente.getQueryCache().find({ queryKey: layoutKeys.campo(slug) })
  const erro = consulta?.observers[0]?.getCurrentResult().error
  return erro instanceof Error ? erro.message : undefined
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useUsosDoCampoLayout — leitura', () => {
  it('devolve os usos na ordem da resposta, com as 6 chaves e o destino nulo preservado', async () => {
    responderUsos({
      'valor-servicos': [USO_COM_DOIS_DESTINOS, USO_SEM_DESTINO, USO_COM_DESTINOS_OMITIDOS],
    })

    const { result } = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(criarCliente()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isError).toBe(false)
    expect(result.current.usos).toEqual([
      USO_COM_DOIS_DESTINOS,
      USO_SEM_DESTINO,
      USO_COM_DESTINOS_OMITIDOS,
    ])
  })

  it('campo sem nenhum uso é resultado legítimo: lista vazia, sem erro', async () => {
    responderUsos({ 'valor-servicos': [] })

    const { result } = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(criarCliente()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.usos).toEqual([])
    expect(result.current.isError).toBe(false)
  })

  it('a leitura FALHA quando a resposta vem no envelope do vizinho (cru na raiz)', async () => {
    server.use(
      http.get(`${API_URL}/layout/campos/valor-servicos`, () =>
        HttpResponse.json(verbeteDoCampo('valor-servicos', [USO_COM_DOIS_DESTINOS])),
      ),
    )

    const { result } = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(criarCliente()),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.usos).toBeUndefined()
  })

  it.each([
    [404, 'CAMPO_LAYOUT_NAO_ENCONTRADO'],
    [410, 'CAMPO_LAYOUT_DESPUBLICADO'],
  ])('%i vira isError, sem tipo próprio', async (status, code) => {
    server.use(
      http.get(`${API_URL}/layout/campos/valor-servicos`, () =>
        HttpResponse.json({ error: { code, message: 'Indisponível.' } }, { status }),
      ),
    )

    const { result } = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(criarCliente()),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isLoading).toBe(false)
  })

  it('refetch busca de novo e a lista aparece depois de uma falha', async () => {
    let chamadas = 0
    server.use(
      http.get(`${API_URL}/layout/campos/valor-servicos`, () => {
        chamadas += 1
        if (chamadas === 1) return HttpResponse.json({ error: { code: 'X' } }, { status: 500 })
        return HttpResponse.json({
          data: verbeteDoCampo('valor-servicos', [USO_COM_DOIS_DESTINOS]),
          message: null,
        })
      }),
    )

    const { result } = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(criarCliente()),
    })
    await waitFor(() => expect(result.current.isError).toBe(true))

    act(() => result.current.refetch())

    await waitFor(() => expect(result.current.usos).toEqual([USO_COM_DOIS_DESTINOS]))
    expect(result.current.isError).toBe(false)
  })

  it('a segunda leitura do mesmo slug dentro do staleTime não faz nova requisição', async () => {
    const requisitados = responderUsos({ 'valor-servicos': [USO_COM_DOIS_DESTINOS] })
    const cliente = criarCliente()

    const primeira = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(cliente),
    })
    await waitFor(() => expect(primeira.result.current.usos).toBeDefined())
    primeira.unmount()

    const segunda = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(cliente),
    })

    expect(segunda.result.current.usos).toEqual([USO_COM_DOIS_DESTINOS])
    expect(segunda.result.current.isLoading).toBe(false)
    expect(requisitados).toEqual(['valor-servicos'])
  })
})

describe('useUsosDoCampoLayout — contrato (D-1)', () => {
  it('item sem a chave destinoXml vira erro nomeado, nunca lista sem destino', async () => {
    const { destinoXml: _ausente, ...usoSemDestinoXml } = USO_COM_DOIS_DESTINOS
    responderVerbeteComOndeEUsado([usoSemDestinoXml])
    const cliente = criarCliente()

    const { result } = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(cliente),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.usos).toBeUndefined()
    expect(mensagemDoErro(cliente, 'valor-servicos')).toBe(
      'A resposta da API não trouxe destinoXml em ondeEUsado (provedor iss-net).',
    )
  })

  it('item sem a chave estadoPreenchimento vira erro nomeado', async () => {
    const { estadoPreenchimento: _ausente, ...usoSemEstado } = USO_COM_DOIS_DESTINOS
    responderVerbeteComOndeEUsado([usoSemEstado])
    const cliente = criarCliente()

    const { result } = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(cliente),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mensagemDoErro(cliente, 'valor-servicos')).toBe(
      'A resposta da API não trouxe estadoPreenchimento em ondeEUsado (provedor iss-net).',
    )
  })

  it('estadoPreenchimento fora dos três valores também é erro', async () => {
    responderVerbeteComOndeEUsado([{ ...USO_COM_DOIS_DESTINOS, estadoPreenchimento: 'Foo' }])
    const cliente = criarCliente()

    const { result } = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(cliente),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mensagemDoErro(cliente, 'valor-servicos')).toBe(
      'A resposta da API não trouxe estadoPreenchimento em ondeEUsado (provedor iss-net).',
    )
  })

  it('destinoXml nulo, com a chave presente, NÃO é erro', async () => {
    responderVerbeteComOndeEUsado([USO_SEM_DESTINO])

    const { result } = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(criarCliente()),
    })

    await waitFor(() => expect(result.current.usos).toEqual([USO_SEM_DESTINO]))
    expect(result.current.isError).toBe(false)
  })

  it('ondeEUsado ausente vira erro nomeado', async () => {
    responderVerbeteComOndeEUsado(undefined)
    const cliente = criarCliente()

    const { result } = renderHook(() => usarUsosDoCampo('valor-servicos'), {
      wrapper: envolver(cliente),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mensagemDoErro(cliente, 'valor-servicos')).toBe(
      'A resposta da API não trouxe a coleção "ondeEUsado", que o contrato exige.',
    )
  })
})

describe('useUsosDoCampoLayout — atraso da navegação (250 ms)', () => {
  /** Só `setTimeout` é falso: o resto do ambiente (MSW, Promises) segue real. */
  function usarRelogioFalso() {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  }

  async function avancar(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  it('na abertura a requisição sai sem esperar os 250 ms', async () => {
    usarRelogioFalso()
    const requisitados = responderUsos({ 'valor-servicos': [] })

    renderHook(() => usarUsosDoCampo('valor-servicos'), { wrapper: envolver(criarCliente()) })

    await avancar(0)
    await vi.waitFor(() => expect(requisitados).toEqual(['valor-servicos']))
  })

  it('trocar o slug cinco vezes em menos de 250 ms faz UMA requisição, para o último', async () => {
    usarRelogioFalso()
    const requisitados = responderUsos({
      a: [],
      b: [],
      c: [],
      d: [],
      e: [USO_COM_DOIS_DESTINOS],
    })

    const { result, rerender } = renderHook(({ slug }) => usarUsosDoCampo(slug), {
      initialProps: { slug: 'a' },
      wrapper: envolver(criarCliente()),
    })
    await vi.waitFor(() => expect(requisitados).toEqual(['a']))

    for (const slug of ['b', 'c', 'd', 'e']) {
      rerender({ slug })
      await avancar(40)
    }
    await avancar(40)

    // 200 ms depois da primeira troca: nada saiu além da abertura.
    expect(requisitados).toEqual(['a'])

    await avancar(60)
    await vi.waitFor(() => expect(result.current.usos).toEqual([USO_COM_DOIS_DESTINOS]))

    expect(requisitados).toEqual(['a', 'e'])
  })

  it('com o slug assentado ainda no campo anterior, não busca o novo: só carrega', async () => {
    const requisitados = responderUsos({ a: [USO_COM_DOIS_DESTINOS], b: [USO_SEM_DESTINO] })

    const { result } = renderHook(() => useUsosDoCampoLayout('b', 'a'), {
      wrapper: envolver(criarCliente()),
    })

    await waitFor(() => expect(requisitados).toEqual(['a']))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.usos).toBeUndefined()
  })

  it('durante o atraso o hook está carregando e NÃO mostra os usos do campo anterior', async () => {
    usarRelogioFalso()
    responderUsos({ a: [USO_COM_DOIS_DESTINOS], b: [USO_SEM_DESTINO] })

    const { result, rerender } = renderHook(({ slug }) => usarUsosDoCampo(slug), {
      initialProps: { slug: 'a' },
      wrapper: envolver(criarCliente()),
    })
    await vi.waitFor(() => expect(result.current.usos).toEqual([USO_COM_DOIS_DESTINOS]))

    rerender({ slug: 'b' })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.usos).toBeUndefined()
    expect(result.current.isError).toBe(false)

    await avancar(100)
    expect(result.current.usos).toBeUndefined()

    await avancar(150)
    await vi.waitFor(() => expect(result.current.usos).toEqual([USO_SEM_DESTINO]))
    expect(result.current.isLoading).toBe(false)
  })
})
