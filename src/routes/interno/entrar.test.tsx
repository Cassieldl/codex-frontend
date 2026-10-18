import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { KeycloakLoginOptions } from 'keycloak-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { caminhoInternoSeguro } from '../../utils/caminhoInternoSeguro'

const ORIGEM = 'https://codex.migrate.info'

/**
 * Reproduz a montagem exata de `redirectUri` em `entrar.tsx`:
 * `${window.location.origin}${caminhoDestino ?? ''}`. `destinoInternoSeguro`
 * foi eliminado (era cópia de `caminhoInternoSeguro`, mesmo racional, mesmo
 * furo de whitespace) — agora há um único saneador na base (AP-SECURITY-010).
 */
function redirectUriParaTeste(destino: string | undefined): string {
  const caminhoDestino = caminhoInternoSeguro(destino)
  return `${ORIGEM}${caminhoDestino ?? ''}`
}

describe('entrar — redirectUri usa caminhoInternoSeguro + concatenação com origin (BAIXO-01)', () => {
  it('sem destino, cai na própria origem', () => {
    expect(redirectUriParaTeste(undefined)).toBe(ORIGEM)
  })

  it('string vazia cai na própria origem', () => {
    expect(redirectUriParaTeste('')).toBe(ORIGEM)
  })

  it('caminho interno absoluto (/interno/provedores/42) é preservado', () => {
    expect(redirectUriParaTeste('/interno/provedores/42')).toBe(`${ORIGEM}/interno/provedores/42`)
  })

  // Matriz de bypass da rodada 2/3 da auditoria: para todo destino hostil, a
  // origem resultante da montagem tem que continuar sendo a da própria app.
  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    `/${String.fromCharCode(9)}/evil.com`, // TAB — bypass do BAIXO-03 (rodada 3)
    `/${String.fromCharCode(10)}/evil.com`, // LF
    `/${String.fromCharCode(13)}/evil.com`, // CR
  ])('destino hostil (%s) nunca produz origem diferente da própria app', (destinoHostil) => {
    const uri = redirectUriParaTeste(destinoHostil)
    expect(new URL(uri).origin).toBe(ORIGEM)
  })

  // Documenta o achado da rodada 2 (§BAIXO-01): quem fecha o vetor de fato é
  // a concatenação com uma origem literal, não (só) o saneador — mesmo um
  // caminho protocol-relative colado direto, sem passar pelo filtro, vira
  // apenas *path* dentro do host legítimo, nunca um host novo. Ver comentário
  // em `caminhoInternoSeguro.ts` e o "NÃO REMOVER" em `entrar.tsx`.
  it('estrutural: concatenar com origem literal impede troca de host mesmo sem o filtro', () => {
    const uriSemPassarPeloFiltro = `${ORIGEM}${'//evil.com'}`
    expect(new URL(uriSemPassarPeloFiltro).origin).toBe(ORIGEM)
  })
})

// --- Detector de regressão da linha que fecha o BAIXO-01 -------------------
//
// O bloco acima reproduz a montagem do `redirectUri` numa função local: ele
// prova que `caminhoInternoSeguro` + concatenação com origem literal fecham o
// vetor, mas NÃO prova que `entrar.tsx` faz isso — copiar a linha não copia a
// garantia (AP-SECURITY-011). O bloco abaixo importa o módulo real e afirma o
// argumento que `keycloak.login` recebe de fato: se a concatenação com
// `window.location.origin` sumir de `entrar.tsx`, estes testes ficam vermelhos.

const mockLogin = vi.fn<(opcoes?: KeycloakLoginOptions) => Promise<void>>(() =>
  Promise.resolve(undefined),
)

vi.mock('../../auth/keycloak', () => ({
  keycloak: { login: mockLogin },
  verificarSessao: () => Promise.resolve('autenticado'),
  IDIOMA_LOGIN: 'pt-BR',
}))

// Import dinâmico (padrão de `_autenticado.test.tsx`): a fábrica do `vi.mock`
// referencia `mockLogin`, que só existe depois desta linha — um import
// estático de `./entrar` seria avaliado antes e cairia em TDZ.
const { Route } = await import('./entrar')

// A assinatura pública de `Route.update` só aceita `UpdatableRouteOptions`: o
// vínculo com o pai (id/path/getParentRoute) é aplicado pelo gerador em
// `routeTree.gen.ts`, que recorre a `as any`. Aqui o cast é o mesmo movimento,
// porém estreitado ao tipo real do parâmetro — é a única forma de montar a
// rota de arquivo REAL num router de teste sem duplicar as opções dela (que,
// duplicadas, reintroduziriam justamente o problema do "teste que copia a
// linha em vez de importá-la").
type VinculoDeRotaDeArquivo = Parameters<typeof Route.update>[0]

// Monta o router de memória com a rota REAL de `entrar.tsx`, do mesmo jeito que
// `routeTree.gen.ts` faz em produção (`Route.update` com o pai + o path).
function renderizarEntrar(destino?: string) {
  const rootRoute = createRootRoute({ component: Outlet })
  const rotaEntrar = Route.update({
    id: '/interno/entrar',
    path: '/interno/entrar',
    getParentRoute: () => rootRoute,
  } as unknown as VinculoDeRotaDeArquivo)
  const busca = destino === undefined ? '' : `?destino=${encodeURIComponent(destino)}`
  const router = createRouter({
    routeTree: rootRoute.addChildren([rotaEntrar]),
    history: createMemoryHistory({ initialEntries: [`/interno/entrar${busca}`] }),
  })

  return render(<RouterProvider router={router} />)
}

function redirectUriDaChamada(indice: number): string {
  const opcoes = mockLogin.mock.calls[indice]?.[0]
  if (!opcoes?.redirectUri) {
    throw new Error(`keycloak.login não recebeu redirectUri na chamada ${indice}`)
  }
  return opcoes.redirectUri
}

describe('entrar — redirectUri REAL entregue a keycloak.login (BAIXO-01 / P-07)', () => {
  beforeEach(() => {
    mockLogin.mockClear()
    mockLogin.mockResolvedValue(undefined)
  })

  // Mesma matriz de bypass das rodadas 2/3/4 da auditoria, agora exercitando o
  // componente de verdade em vez de uma cópia da linha.
  it.each([
    'https://evil.com',
    '//evil.com',
    `/${String.fromCharCode(92)}evil.com`, // barra invertida
    `/${String.fromCharCode(9)}/evil.com`, // TAB
    `/${String.fromCharCode(10)}/evil.com`, // LF
    `/${String.fromCharCode(13)}/evil.com`, // CR
    'javascript:alert(1)',
    '@evil.com',
    '.evil.com',
  ])('destino hostil (%s) chega a keycloak.login como a própria origem', async (destinoHostil) => {
    renderizarEntrar(destinoHostil)

    expect(await screen.findByRole('status')).toBeInTheDocument()
    await vi.waitFor(() => expect(mockLogin).toHaveBeenCalled())

    const redirectUri = redirectUriDaChamada(0)
    expect(new URL(redirectUri).origin).toBe(window.location.origin)
    expect(redirectUri).toBe(window.location.origin)
  })

  it('sem destino, keycloak.login recebe a própria origem', async () => {
    renderizarEntrar()

    expect(await screen.findByRole('status')).toBeInTheDocument()
    await vi.waitFor(() => expect(mockLogin).toHaveBeenCalled())

    expect(redirectUriDaChamada(0)).toBe(window.location.origin)
  })

  /**
   * A tela de login é hospedada pelo Keycloak, então o idioma dela é o que
   * pedirmos aqui. Sem este pedido ela abre no padrão do realm — abriu em
   * inglês no meio de um portal em português, logo na porta da área interna.
   */
  it('pede a tela de login em português', async () => {
    renderizarEntrar()

    expect(await screen.findByRole('status')).toBeInTheDocument()
    await vi.waitFor(() => expect(mockLogin).toHaveBeenCalled())

    expect(mockLogin.mock.calls[0]?.[0]?.locale).toBe('pt-BR')
  })

  // Este é o caso que morre se alguém apagar `${window.location.origin}` e
  // deixar `const redirectUri = caminhoDestino ?? ''`: o caminho interno seria
  // entregue ao Keycloak sem host.
  it('destino interno legítimo vira caminho DENTRO da origem, nunca o caminho solto', async () => {
    renderizarEntrar('/interno/provedores/42')

    expect(await screen.findByRole('status')).toBeInTheDocument()
    await vi.waitFor(() => expect(mockLogin).toHaveBeenCalled())

    const redirectUri = redirectUriDaChamada(0)
    expect(redirectUri).toBe(`${window.location.origin}/interno/provedores/42`)
    expect(new URL(redirectUri).origin).toBe(window.location.origin)
  })

  // Segundo ponto de uso do `redirectUri` (P-07): o botão de fallback, que só
  // aparece quando o redirect automático falha.
  it('botão de fallback reenvia o MESMO redirectUri saneado quando o redirect automático falha', async () => {
    const usuario = userEvent.setup()
    mockLogin.mockRejectedValueOnce(new Error('redirect indisponível'))

    renderizarEntrar('//evil.com')

    const botao = await screen.findByRole('button', { name: 'Entrar com a conta Migrate' })
    await usuario.click(botao)

    expect(mockLogin).toHaveBeenCalledTimes(2)
    expect(redirectUriDaChamada(1)).toBe(window.location.origin)
    expect(redirectUriDaChamada(1)).toBe(redirectUriDaChamada(0))
  })
})
