import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/mocks/server'
import { useSlugAssentadoDoCampo } from '../hooks/useUsosDoCampoLayout'
import { UsosDoCampo } from './UsosDoCampo'

const API_URL = import.meta.env.VITE_API_URL

/**
 * Usos transcritos do DTO de P12 (`UsoCampoLayoutDto`), em JSON literal e **fora da ordem
 * alfabética** dos provedores: a lista tem de sair como o servidor a mandou.
 */
const USO_ISS_NET = {
  provedorSlug: 'iss-net',
  provedorNome: 'ISS.NET',
  versaoSlug: '2-04',
  versaoRotulo: '2.04',
  destinoXml: 'DPS/infDPS/serv/vServ | DPS/infDPS/serv/vServPrest',
  estadoPreenchimento: 'Obrigatorio',
}

const USO_ABRASF = {
  provedorSlug: 'abrasf',
  provedorNome: 'ABRASF',
  versaoSlug: '2-03',
  versaoRotulo: '2.03',
  destinoXml: null,
  estadoPreenchimento: 'Opcional',
}

const USO_BETHA = {
  provedorSlug: 'betha',
  provedorNome: 'Betha',
  versaoSlug: '1-00',
  versaoRotulo: '1.00',
  destinoXml: 'Servico/Valores/ValServicos | …',
  estadoPreenchimento: 'Condicional',
}

const USOS_FORA_DA_ORDEM_ALFABETICA = [USO_ISS_NET, USO_ABRASF, USO_BETHA]

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

function responderUsos(slug: string, ondeEUsado: unknown) {
  return http.get(`${API_URL}/layout/campos/${slug}`, () =>
    HttpResponse.json({ data: verbeteDoCampo(slug, ondeEUsado), message: null }),
  )
}

const CAMPO = 'servico-valores-valservicos'
const NOME_DO_CAMPO = 'Valor dos serviços'

/** Um botão fora da seção troca o campo, como a navegação do modal faz. */
function PaginaDeTeste({ campoInicial }: { campoInicial: string }) {
  const [campoSlug, setCampoSlug] = useState(campoInicial)
  const slugAssentado = useSlugAssentadoDoCampo(campoSlug)

  return (
    <>
      <button type="button" onClick={() => setCampoSlug('servico-valores-iss')}>
        Trocar de campo
      </button>
      <UsosDoCampo
        campoSlug={campoSlug}
        slugAssentado={slugAssentado}
        nomeDoCampo={NOME_DO_CAMPO}
      />
    </>
  )
}

function renderizar(campoInicial = CAMPO) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({ component: Outlet })
  const rota = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <PaginaDeTeste campoInicial={campoInicial} />,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([rota]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

async function secaoDeUsos() {
  return screen.findByRole('region', { name: 'Como cada provedor usa este campo' })
}

async function itensDaLista() {
  const secao = await secaoDeUsos()
  return await within(secao).findAllByRole('listitem')
}

describe('UsosDoCampo — lista', () => {
  it('lista os provedores na ordem exata da resposta', async () => {
    server.use(responderUsos(CAMPO, USOS_FORA_DA_ORDEM_ALFABETICA))
    renderizar()

    await itensDaLista()

    const nomesDosLinks = screen.getAllByRole('link').map((link) => link.getAttribute('aria-label'))
    expect(nomesDosLinks).toEqual([
      'Ver no provedor: Valor dos serviços em ISS.NET',
      'Ver no provedor: Valor dos serviços em ABRASF',
      'Ver no provedor: Valor dos serviços em Betha',
    ])
  })

  it('cada destino mostra a tag e o caminho completo; destino omitido vira texto, nunca tag', async () => {
    server.use(responderUsos(CAMPO, USOS_FORA_DA_ORDEM_ALFABETICA))
    renderizar()

    const [issNet, abrasf, betha] = await itensDaLista()

    expect(within(issNet).getByText('vServ')).toBeInTheDocument()
    expect(within(issNet).getByText('vServPrest')).toBeInTheDocument()
    expect(issNet).toHaveTextContent('DPS/infDPS/serv/vServ')
    expect(issNet).toHaveTextContent('DPS/infDPS/serv/vServPrest')

    expect(within(betha).getByText('ValServicos')).toBeInTheDocument()
    expect(within(betha).getByText('e mais destinos')).toBeInTheDocument()
    expect(within(betha).queryByText('…')).toBeNull()

    expect(within(abrasf).getByText('sem destino no XML deste provedor')).toBeInTheDocument()
  })

  it('a obrigatoriedade sai de estadoPreenchimento, um valor por provedor', async () => {
    server.use(responderUsos(CAMPO, USOS_FORA_DA_ORDEM_ALFABETICA))
    renderizar()

    const [issNet, abrasf, betha] = await itensDaLista()

    expect(within(issNet).getByText('Obrigatório')).toBeInTheDocument()
    expect(within(abrasf).getByText('Opcional')).toBeInTheDocument()
    expect(within(betha).getByText('Condicional')).toBeInTheDocument()
    expect(within(issNet).queryByText('Opcional')).toBeNull()
  })

  it('o link leva à linha do campo na página do provedor, sem versão, na mesma aba', async () => {
    server.use(responderUsos(CAMPO, [USO_ISS_NET]))
    renderizar()

    await itensDaLista()

    const link = screen.getByRole('link', {
      name: 'Ver no provedor: Valor dos serviços em ISS.NET',
    })

    expect(link).toHaveAttribute('href', '/provedores/iss-net#campo-servico-valores-valservicos')
    expect(link).not.toHaveAttribute('target')
  })

  it('o nome acessível do link começa pelo texto visível (WCAG 2.5.3)', async () => {
    server.use(responderUsos(CAMPO, [USO_ISS_NET]))
    renderizar()

    await itensDaLista()

    const link = screen.getByRole('link', { name: /Ver no provedor/ })

    expect(link).toHaveTextContent('Ver no provedor')
    expect(link.getAttribute('aria-label')?.startsWith(link.textContent ?? '')).toBe(true)
  })
})

describe('UsosDoCampo — estados', () => {
  it('carregando: região de status com o texto para leitor de tela, dentro da seção', async () => {
    server.use(
      http.get(`${API_URL}/layout/campos/${CAMPO}`, async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
    renderizar()

    const secao = await secaoDeUsos()
    const carregando = within(secao).getByRole('status')

    expect(carregando).toHaveAttribute('aria-busy', 'true')
    expect(carregando).toHaveTextContent('Carregando os provedores que usam este campo…')
    expect(within(secao).queryByRole('list')).toBeNull()
  })

  it('vazio: diz que nenhum provedor publicado usa o campo', async () => {
    server.use(responderUsos(CAMPO, []))
    renderizar()

    const secao = await secaoDeUsos()

    expect(
      await within(secao).findByText('Nenhum provedor publicado usa este campo ainda.'),
    ).toBeInTheDocument()
    expect(within(secao).queryByRole('list')).toBeNull()
  })

  it('erro: mensagem e "Tentar novamente" dentro da seção, sem roubar o foco; tentar de novo mostra a lista', async () => {
    let chamadas = 0
    server.use(
      http.get(`${API_URL}/layout/campos/${CAMPO}`, () => {
        chamadas += 1
        if (chamadas === 1) {
          return HttpResponse.json({ error: { code: 'ERRO_INTERNO' } }, { status: 500 })
        }
        return HttpResponse.json({ data: verbeteDoCampo(CAMPO, [USO_ISS_NET]), message: null })
      }),
    )
    const usuario = userEvent.setup()
    renderizar()

    const secao = await secaoDeUsos()
    expect(
      await within(secao).findByText('Não foi possível carregar os provedores deste campo.'),
    ).toBeInTheDocument()

    const tentarNovamente = within(secao).getByRole('button', { name: 'Tentar novamente' })
    expect(tentarNovamente).not.toHaveFocus()

    await usuario.click(tentarNovamente)

    expect(await within(secao).findByText('ISS.NET')).toBeInTheDocument()
    expect(
      within(secao).queryByText('Não foi possível carregar os provedores deste campo.'),
    ).toBeNull()
  })

  it('chave do contrato faltando cai no mesmo estado de erro, nunca numa lista sem tag', async () => {
    const { destinoXml: _ausente, ...usoSemDestinoXml } = USO_ISS_NET
    server.use(responderUsos(CAMPO, [usoSemDestinoXml]))
    renderizar()

    const secao = await secaoDeUsos()

    expect(
      await within(secao).findByText('Não foi possível carregar os provedores deste campo.'),
    ).toBeInTheDocument()
    expect(within(secao).queryByRole('list')).toBeNull()
  })
})

describe('UsosDoCampo — troca de campo (R4)', () => {
  it('com o campo A em cache e o B pendente, os usos de A não aparecem sob o B', async () => {
    const requisitados: string[] = []
    server.use(
      http.get(`${API_URL}/layout/campos/:campoSlug`, async ({ params }) => {
        const slug = String(params.campoSlug)
        requisitados.push(slug)

        if (slug === 'servico-valores-iss') {
          await delay('infinite')
        }
        return HttpResponse.json({ data: verbeteDoCampo(slug, [USO_ISS_NET]), message: null })
      }),
    )
    const usuario = userEvent.setup()
    renderizar()

    await screen.findByText('ISS.NET')

    await usuario.click(screen.getByRole('button', { name: 'Trocar de campo' }))

    // O pedido do campo B sai depois do atraso; só então o "dado anterior" poderia vazar.
    await waitFor(() => expect(requisitados).toContain('servico-valores-iss'))

    const secao = await secaoDeUsos()
    expect(within(secao).getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('ISS.NET')).toBeNull()
  })
})
