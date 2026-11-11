import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { routeTree } from '../../routeTree.gen'

const TIMEOUT_CARGA_DA_ARVORE_REAL_MS = 60_000

// Árvore real: prova que o arquivo de rota com versão está ligado ao redirecionamento.
describe('/provedores/{slug}/{versao}', () => {
  it(
    'vira /provedores/{slug} mantendo a âncora, no lugar da entrada antiga do histórico',
    async () => {
      const history = createMemoryHistory({
        initialEntries: ['/layout', '/provedores/ipm-sistemas/2-04#avisos'],
      })
      const router = createRouter({ routeTree, history })

      await router.load()

      expect(router.state.location.pathname).toBe('/provedores/ipm-sistemas')
      expect(router.state.location.hash).toBe('avisos')
      expect(history.length).toBe(2)
    },
    TIMEOUT_CARGA_DA_ARVORE_REAL_MS,
  )
})
