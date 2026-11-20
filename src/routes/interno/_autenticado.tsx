import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { keycloak, verificarSessao } from '../../auth/keycloak'
import { ID_CONTEUDO_PRINCIPAL, PularParaConteudo } from '../../components/layout/PularParaConteudo'
import { BarraDeComando } from '../../features/interno/busca/components/BarraDeComando'
import {
  FalhaNaAreaInterna,
  VerificandoSessao,
} from '../../features/interno/components/EstadoDaSessao'
import { LoginIndisponivelErro } from '../../features/interno/components/loginIndisponivelErro'
import { PublicarComunicadoGlobal } from '../../features/interno/comunicados/components/PublicarComunicadoGlobal'

// Guard da área interna: toda rota sob `interno/_autenticado/` herda esta checagem. Sem sessão,
// redireciona para `/interno/entrar` preservando o destino original na query string.
export const Route = createFileRoute('/interno/_autenticado')({
  beforeLoad: async ({ location }) => {
    const estado = await verificarSessao()
    if (estado === 'indisponivel') {
      throw new LoginIndisponivelErro()
    }
    if (estado === 'anonimo') {
      throw redirect({ to: '/interno/entrar', search: { destino: location.href } })
    }
  },
  // O check-sso pode levar segundos (ou estourar o tempo, com o Keycloak fora): nunca tela em branco.
  pendingMs: 0,
  pendingComponent: VerificandoSessao,
  errorComponent: FalhaNaAreaInterna,
  component: LayoutInterno,
})

/**
 * Teto de largura da área interna, aplicado ao cabeçalho e ao conteúdo.
 *
 * Sem ele as tabelas de edição esticavam até a borda do monitor: num monitor
 * largo, o nome do campo ficava numa ponta e os botões de ação na outra, com
 * meio metro de vazio no meio. É mais folgado que o `max-w-pagina` do portal
 * público porque aqui as tabelas têm colunas de ação que lá não existem.
 */
const LARGURA_DO_CONTEUDO = 'mx-auto w-full max-w-7xl'

const ITENS_NAV = [
  { to: '/interno' as const, rotulo: 'Início' },
  { to: '/interno/provedores' as const, rotulo: 'Provedores' },
  { to: '/interno/campos-layout' as const, rotulo: 'Campos do layout' },
  { to: '/interno/erros' as const, rotulo: 'Erros' },
  { to: '/interno/artigos' as const, rotulo: 'Artigos' },
  { to: '/interno/comunicados' as const, rotulo: 'Comunicados' },
]

/**
 * Marca toda a área interna como `noindex, nofollow` - checklist §9 de
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
      {/* Mesmo gesto do portal público: a navegação interna também se repete em toda tela. */}
      <PularParaConteudo />

      <header className="border-b border-border bg-white px-4 py-3 lg:px-8">
        <div className={`${LARGURA_DO_CONTEUDO} flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex flex-wrap items-center gap-6">
            {/* A marca some da área interna sem isto: a tela abria direto no
                menu, sem dizer em que produto o editor está. */}
            <Link to="/" className="text-base font-bold text-ink hover:shadow-hover">
              Codex
            </Link>

            <nav aria-label="Navegação da área interna">
              <ul className="flex flex-wrap gap-1">
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
          </div>

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
        </div>
      </header>

      <main id={ID_CONTEUDO_PRINCIPAL} tabIndex={-1} className="flex-1 px-4 py-6 lg:px-8">
        <div className={LARGURA_DO_CONTEUDO}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
