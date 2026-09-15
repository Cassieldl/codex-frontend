import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { garantirAutenticacao, keycloak } from '../../auth/keycloak'
import { BarraDeComando } from '../../features/interno/busca/components/BarraDeComando'
import { PublicarComunicadoGlobal } from '../../features/interno/comunicados/components/PublicarComunicadoGlobal'

// Guard da área interna. Layout pathless — qualquer rota sob `interno/_autenticado/`
// (telas de outra unidade) herda esta checagem. Sem sessão, redireciona
// para `/interno/entrar` preservando o destino original na query string.
export const Route = createFileRoute('/interno/_autenticado')({
  beforeLoad: async ({ location }) => {
    const autenticado = await garantirAutenticacao()
    if (!autenticado) {
      throw redirect({ to: '/interno/entrar', search: { destino: location.href } })
    }
  },
  component: LayoutInterno,
})

const ITENS_NAV = [
  { to: '/interno' as const, rotulo: 'Início' },
  { to: '/interno/provedores' as const, rotulo: 'Provedores' },
  { to: '/interno/campos-layout' as const, rotulo: 'Campos do layout' },
  { to: '/interno/erros' as const, rotulo: 'Erros' },
  { to: '/interno/artigos' as const, rotulo: 'Artigos' },
  { to: '/interno/comunicados' as const, rotulo: 'Comunicados' },
]

/**
 * Marca toda a área interna como `noindex, nofollow` — checklist §9 de
 * acessibilidade/SEO. Insere a meta tag ao montar o layout e remove ao
 * desmontar, para não vazar para o portal público quando o usuário navega
 * de volta a uma rota fora de `/interno/**`.
 */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)

    return () => {
      document.head.removeChild(meta)
    }
  }, [])
}

function LayoutInterno() {
  useNoIndex()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-white px-4 py-3 lg:px-8">
        <nav aria-label="Navegação da área interna">
          <ul className="flex gap-1">
            {ITENS_NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === '/interno' }}
                  className="flex h-10 items-center rounded px-2 text-sm font-medium text-muted hover:shadow-hover"
                  activeProps={{ className: 'text-ink', 'aria-current': 'page' }}
                >
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Ações globais da área interna: a barra de comando (o atalho vale em
            toda rota autenticada) e a publicação de comunicado, que nasce
            escondida sem a role. */}
        <div className="flex items-center gap-1">
          <BarraDeComando />
          <PublicarComunicadoGlobal />
          <button
            type="button"
            onClick={() => keycloak.logout({ redirectUri: window.location.origin })}
            className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium text-ink hover:shadow-hover"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
