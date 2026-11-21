import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { keycloak, verificarSessao } from '../../auth/keycloak'
import { PontosDeLuz } from '../../components/layout/PontosDeLuz'
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

/**
 * Item do menu interno, no mesmo desenho do portal público: a página aberta fica em semibold,
 * laranja e com o traço de 2 px embaixo. O texto usa `accent-sobre-escuro`, que passa de 4,5:1
 * sobre o cabeçalho escuro; o traço fica no `accent`.
 */
const CLASSE_ITEM_NAV =
  'relative flex h-10 items-center px-1 text-sm font-medium text-white after:absolute after:inset-x-1 after:bottom-1.5 after:h-0.5 after:rounded-pill after:bg-transparent hover:text-accent-sobre-escuro aria-[current=page]:font-semibold aria-[current=page]:text-accent-sobre-escuro aria-[current=page]:after:bg-accent'

function LayoutInterno() {
  useNoIndex()

  return (
    <div className="flex min-h-screen flex-col bg-surface-hover">
      {/* Mesmo gesto do portal público: a navegação interna também se repete em toda tela. */}
      <PularParaConteudo />

      {/* Mesmo cabeçalho escuro do portal: o logo oficial da Migrate só existe na versão branca. */}
      <header className="relative isolate bg-primary px-4 py-3 text-white lg:px-8">
        <PontosDeLuz />

        <div className={`${LARGURA_DO_CONTEUDO} flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              to="/"
              aria-label="Migrate Codex, página inicial do portal"
              className="flex items-center gap-3"
            >
              <img src="/marca/logo-migrate-branco.svg" alt="Migrate" className="h-7 w-auto" />
              <span aria-hidden="true" className="h-6 w-px bg-white/40" />
              <span className="text-lg font-extrabold">Codex</span>
            </Link>

            <nav aria-label="Navegação da área interna">
              <ul className="flex flex-wrap gap-4">
                {ITENS_NAV.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      activeOptions={{ exact: item.to === '/interno' }}
                      className={CLASSE_ITEM_NAV}
                      activeProps={{ 'aria-current': 'page' }}
                    >
                      {item.rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Ações globais numa faixa clara, como o campo de busca do cabeçalho público: a barra de
            comando vale em toda rota autenticada e a publicação de comunicado some sem a role. */}
          <div className="flex items-center gap-1 rounded-[var(--radius-control)] bg-white p-1">
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
