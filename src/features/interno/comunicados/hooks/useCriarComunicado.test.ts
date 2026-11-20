import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import type { ComunicadoFormDto } from '../types/comunicadoAdmin'
import { useCriarComunicado } from './useCriarComunicado'
import type { ResultadoCriarComunicado } from './useCriarComunicado'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de ComunicadoAdminDto, sem o tipo do cliente.
const detalheCriado = {
  id: 90,
  titulo: 'Instabilidade na SEFIN',
  corpo: 'Emissões podem demorar até as 18h.',
  severidade: 'Alerta',
  abrangencia: 'Global',
  provedorId: null,
  provedorNome: null,
  versaoProvedorId: null,
  versaoRotulo: null,
  expiraEm: '2099-03-01T18:00:00+00:00',
  publicado: false,
  encerrado: false,
  versaoConcorrencia: 1,
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCriarComunicado (I32)', () => {
  it('não envia If-Match - o recurso ainda não existe, não há versão a conferir', async () => {
    const capturado: { ifMatch: string | null; corpo: unknown } = { ifMatch: null, corpo: null }
    server.use(
      http.post(`${API_URL}/interno/comunicados`, async ({ request }) => {
        capturado.ifMatch = request.headers.get('If-Match')
        capturado.corpo = await request.json()
        return HttpResponse.json(
          { data: detalheCriado, message: 'Comunicado criado.' },
          { status: 201 },
        )
      }),
    )

    const dto: ComunicadoFormDto = {
      titulo: 'Instabilidade na SEFIN',
      corpo: 'Emissões podem demorar até as 18h.',
      severidade: 'Alerta',
      abrangencia: 'Global',
      expiraEm: '2099-03-01T18:00:00.000Z',
    }

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useCriarComunicado(), {
      wrapper: criarWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(dto)
    })

    expect(capturado.ifMatch).toBeNull()
    expect(capturado.corpo).toEqual(dto)
  })

  it('abrangência Global não manda provedorId nem versaoProvedorId no payload', async () => {
    const capturado: { corpo: Record<string, unknown> | null } = { corpo: null }
    server.use(
      http.post(`${API_URL}/interno/comunicados`, async ({ request }) => {
        capturado.corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ data: detalheCriado, message: null }, { status: 201 })
      }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useCriarComunicado(), {
      wrapper: criarWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        titulo: 'Global',
        corpo: 'Vale para todo mundo.',
        severidade: 'Informativo',
        abrangencia: 'Global',
        expiraEm: '2099-03-01T18:00:00.000Z',
      })
    })

    // `undefined` some na serialização JSON: o CHECK de consistência de escopo
    // do banco recusaria um provedorId pendurado num comunicado global.
    expect(capturado.corpo).not.toHaveProperty('provedorId')
    expect(capturado.corpo).not.toHaveProperty('versaoProvedorId')
  })

  it('lê o detalhe do envelope { data } - I32 não responde corpo cru', async () => {
    server.use(
      http.post(`${API_URL}/interno/comunicados`, () =>
        HttpResponse.json({ data: detalheCriado, message: null }, { status: 201 }),
      ),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useCriarComunicado(), {
      wrapper: criarWrapper(queryClient),
    })

    let retorno: ResultadoCriarComunicado | undefined
    await act(async () => {
      retorno = await result.current.mutateAsync({
        titulo: 'Instabilidade na SEFIN',
        corpo: 'Emissões podem demorar até as 18h.',
        severidade: 'Alerta',
        abrangencia: 'Global',
        expiraEm: '2099-03-01T18:00:00.000Z',
      })
    })

    expect(retorno?.comunicado.corpo).toBe('Emissões podem demorar até as 18h.')
    expect(retorno?.comunicado.id).toBe(90)
  })
})

describe('useCriarComunicado: D-1 (publicar)', () => {
  it('devolve a message do envelope junto com o comunicado - a tela nunca infere o desfecho', async () => {
    server.use(
      http.post(`${API_URL}/interno/comunicados`, () =>
        HttpResponse.json(
          { data: { ...detalheCriado, publicado: true }, message: 'Comunicado publicado.' },
          { status: 201 },
        ),
      ),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useCriarComunicado(), {
      wrapper: criarWrapper(queryClient),
    })

    let retorno: ResultadoCriarComunicado | undefined
    await act(async () => {
      retorno = await result.current.mutateAsync({
        titulo: 'Instabilidade na SEFIN',
        corpo: 'Emissões podem demorar até as 18h.',
        severidade: 'Alerta',
        abrangencia: 'Global',
        expiraEm: '2099-03-01T18:00:00.000Z',
        publicar: true,
      })
    })

    expect(retorno?.mensagem).toBe('Comunicado publicado.')
    expect(retorno?.comunicado.publicado).toBe(true)
  })

  it('quem não define publicar continua criando rascunho - o campo nem viaja', async () => {
    const capturado: { corpo: Record<string, unknown> | null } = { corpo: null }
    server.use(
      http.post(`${API_URL}/interno/comunicados`, async ({ request }) => {
        capturado.corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { data: detalheCriado, message: 'Comunicado criado como rascunho.' },
          { status: 201 },
        )
      }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useCriarComunicado(), {
      wrapper: criarWrapper(queryClient),
    })

    let retorno: ResultadoCriarComunicado | undefined
    await act(async () => {
      // A tela 12 chama exatamente assim, sem `publicar` - D-1 não muda o
      // comportamento dela.
      retorno = await result.current.mutateAsync({
        titulo: 'Instabilidade na SEFIN',
        corpo: 'Emissões podem demorar até as 18h.',
        severidade: 'Alerta',
        abrangencia: 'Global',
        expiraEm: '2099-03-01T18:00:00.000Z',
      })
    })

    expect(capturado.corpo).not.toHaveProperty('publicar')
    expect(retorno?.mensagem).toBe('Comunicado criado como rascunho.')
  })
})
