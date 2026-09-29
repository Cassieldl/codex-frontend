import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { PaginaNaoEncontrada } from '../components/layout/PaginaNaoEncontrada'

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-router-devtools').then((modulo) => ({
        default: modulo.TanStackRouterDevtools,
      })),
    )

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: PaginaNaoEncontrada,
})

function RootComponent() {
  return (
    <>
      <Outlet />
      <Suspense fallback={null}>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
    </>
  )
}
