import '@testing-library/jest-dom'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './mocks/server'

// O default de 1s dos `findBy*` estoura por carga, não por defeito, nos testes que montam router +
// MSW + jsdom juntos — e a falha aparece como "elemento não encontrado" com a tela ainda em
// "Carregando…", que parece bug de produto e não é.
configure({ asyncUtilTimeout: 5000 })

// MSW intercepta toda chamada de rede nos testes — nenhum teste deve bater
// numa API real. `onUnhandledRequest: 'error'` garante que um endpoint sem
// handler falhe alto (nunca passe silenciosamente).
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  cleanup()
})

afterAll(() => server.close())
