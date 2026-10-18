import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { useResultadoBuscaInterna } from '../hooks/useResultadoBuscaInterna'
import { ResultadoBuscaInternaLista } from './ResultadoBuscaInternaLista'

const API_URL = import.meta.env.VITE_API_URL

// JSON transcrito de `ResultadoBuscaDto` e de `ConsultaBuscaPostgres` (tipo cru da coluna
// `itensbusca.tipoitem`, rótulos de grupo e de item), sem o tipo do cliente: é o fio, não a
// crença do frontend sobre ele.
const respostaDaApiInterna = {
  data: {
    termo: 'IPM',
    termoUsado: 'IPM',
    correcao: null,
    qualidade: 'exata',
    totalGeral: 2,
    grupos: [
      {
        tipo: 'versaoprovedor',
        rotulo: 'Versões de provedor',
        total: 1,
        pontuacao: 0.91,
        itens: [
          {
            tipo: 'versaoprovedor',
            rotulo: 'VERSÃO',
            chave: null,
            titulo: 'IPM NTE 122/2025',
            url: '/provedores/ipm/nte-122-2025',
            provedorNome: 'IPM',
            versaoRotulo: 'NTE 122/2025',
            versoes: null,
            meta: { tipo: 'verificacao', data: '2026-05-12' },
            descricaoCasamento: 'casou com o termo pesquisado',
            publicado: false,
            pontuacao: 0.91,
            trechos: [{ texto: 'IPM', destacado: true }],
          },
        ],
      },
      {
        tipo: 'campolayout',
        rotulo: 'Campos do layout',
        total: 1,
        pontuacao: 0.42,
        itens: [
          {
            tipo: 'campolayout',
            rotulo: 'CAMPO DO LAYOUT',
            chave: null,
            titulo: 'CodigoMunicipioIpm',
            url: '/layout/campos/servico-codigomunicipioipm',
            provedorNome: null,
            versaoRotulo: null,
            versoes: null,
            meta: null,
            descricaoCasamento: 'casou com o termo pesquisado',
            publicado: false,
            pontuacao: 0.42,
            trechos: [],
          },
        ],
      },
    ],
    foraDoFiltro: null,
    filtroProvedor: null,
  },
  message: null,
}

function TelaDeBuscaInterna() {
  const { data } = useResultadoBuscaInterna({ q: 'IPM' })
  if (!data) return null
  return <ResultadoBuscaInternaLista grupos={data.grupos} />
}

function renderizarComRespostaDaApi() {
  server.use(http.get(`${API_URL}/interno/busca`, () => HttpResponse.json(respostaDaApiInterna)))
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <TelaDeBuscaInterna />
    </QueryClientProvider>,
  )
}

describe('busca interna contra o JSON da API', () => {
  it('versão de provedor em rascunho oferece o link interno e nomeia a listagem', async () => {
    renderizarComRespostaDaApi()

    const botao = await screen.findByRole('button', {
      name: 'Copiar link interno de IPM NTE 122/2025 (leva à listagem de versões de provedor, não ao registro)',
    })
    expect(botao).toHaveTextContent('Copiar link interno (lista)')
  })

  it('campo do layout em rascunho oferece o link interno e nomeia a listagem', async () => {
    renderizarComRespostaDaApi()

    const botao = await screen.findByRole('button', {
      name: 'Copiar link interno de CodigoMunicipioIpm (leva à listagem de campos do layout, não ao registro)',
    })
    expect(botao).toHaveTextContent('Copiar link interno (lista)')
  })

  it('nenhum dos dois cai no estado "sem link de edição direta"', async () => {
    renderizarComRespostaDaApi()

    await screen.findAllByRole('button', { name: /^Copiar link interno de/ })
    expect(screen.getAllByRole('button', { name: /^Copiar link interno de/ })).toHaveLength(2)
    expect(screen.queryByText('Sem link de edição direta')).not.toBeInTheDocument()
  })
})
