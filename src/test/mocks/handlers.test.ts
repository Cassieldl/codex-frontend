import axios from 'axios'
import { describe, expect, it } from 'vitest'
import { handlerBuscaVazia, handlerErroDetalhePadrao } from './handlers'
import { server } from './server'

const API_URL = import.meta.env.VITE_API_URL

describe('handlerBuscaVazia', () => {
  it('responde GET /busca com o envelope ApiResponse e o novo shape (P1/I21)', async () => {
    server.use(handlerBuscaVazia())

    const { data } = await axios.get<{ data: { grupos: unknown[]; qualidade: string } }>(
      `${API_URL}/busca`,
    )

    expect(data.data.grupos).toEqual([])
    expect(data.data.qualidade).toBe('vazia')
  })
})

describe('handlerErroDetalhePadrao', () => {
  it('responde GET /erros/:slug com artigosRelacionados: [] (PQ-08), nunca omitido', async () => {
    server.use(handlerErroDetalhePadrao('e0117'))

    const { data } = await axios.get<{ data: { artigosRelacionados: unknown[]; slug: string } }>(
      `${API_URL}/erros/e0117`,
    )

    expect(data.data.artigosRelacionados).toEqual([])
    expect(data.data.slug).toBe('e0117')
  })
})
