import { Link } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { ShieldX, TriangleAlert } from 'lucide-react'
import { navegacaoDoNavegador } from '../../../auth/sessaoExpirada'
import { Button } from '../../../components/ui/Button'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoginIndisponivelErro } from './loginIndisponivelErro'

/** Enquanto o check-sso não responde, a área interna não fica em branco. */
export function VerificandoSessao() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <p role="status" className="text-sm text-muted">
        Verificando sua sessão…
      </p>
    </main>
  )
}

export interface LoginIndisponivelProps {
  onTentarDeNovo: () => void
}

/** Sem esta tela o editor caía na página de erro do navegador ao tentar o redirect de login. */
export function LoginIndisponivel({ onTentarDeNovo }: LoginIndisponivelProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <TriangleAlert aria-hidden="true" className="size-10 text-error" />
      <h1 className="text-titulo font-bold text-ink">O login está indisponível agora</h1>
      <p className="max-w-md text-sm text-muted">
        O serviço de autenticação da Migrate não respondeu. O portal público continua no ar; a área
        interna volta assim que o login responder.
      </p>
      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- tela de bloqueio com uma ação principal */}
      <Button onClick={onTentarDeNovo} autoFocus>
        Tentar de novo
      </Button>
    </main>
  )
}

export interface AcessoRecusadoProps {
  onSair: () => void
  onTentarDeNovo: () => void
}

/** Para o ciclo de recarga quando a API recusa a sessão de novo a cada volta ao login. */
export function AcessoRecusado({ onSair, onTentarDeNovo }: AcessoRecusadoProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <ShieldX aria-hidden="true" className="size-10 text-error" />
      <h1 className="text-titulo font-bold text-ink">O acesso à área interna foi recusado</h1>
      <p className="max-w-md text-sm text-muted">
        Você entrou com a conta Migrate, mas a API do Codex recusou a sessão várias vezes seguidas.
        Entrar de novo agora levaria ao mesmo resultado. Se continuar acontecendo, avise o time
        responsável pelo Codex.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- tela de bloqueio com uma ação principal */}
        <Button onClick={onSair} autoFocus>
          Sair da conta Migrate
        </Button>
        <Button variant="secondary" onClick={onTentarDeNovo}>
          Tentar de novo
        </Button>
      </div>
      <Link to="/" className="text-sm font-medium text-ink underline hover:shadow-hover">
        Voltar ao portal
      </Link>
    </main>
  )
}

/** Fronteira de erro do guard da área interna. */
export function FalhaNaAreaInterna({ error, reset }: ErrorComponentProps) {
  if (error instanceof LoginIndisponivelErro) {
    // O keycloak-js só inicializa uma vez por carga: tentar de novo é recarregar a página.
    return <LoginIndisponivel onTentarDeNovo={() => navegacaoDoNavegador.recarregar()} />
  }

  return (
    <main className="px-4 py-6">
      <ErrorState onRetry={reset} autoFocusRetry />
    </main>
  )
}
