import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { authStore } from './auth/authStore'
import { iniciarAutenticacao } from './auth/keycloak'
import { routeTree } from './routeTree.gen'
import './styles/global.css'

const queryClient = new QueryClient()
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Não bloqueante: o RouterProvider monta ANTES de qualquer resposta do
// Keycloak. `keycloak.init()` REJEITA quando o check-sso falha — sem este
// `.catch()`, o erro estoura no error boundary do router e derruba o
// portal público inteiro.
iniciarAutenticacao().catch((erro: unknown) => {
  console.error('Falha ao inicializar Keycloak (silenciosa para o público):', erro)
  authStore.setState({ estado: 'anonimo' })
})

const elementoRaiz = document.getElementById('root')
if (!elementoRaiz) {
  throw new Error('Elemento #root não encontrado.')
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
