import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { IDIOMA_LOGIN, keycloak, verificarSessao } from '../../auth/keycloak'
import { estaEmLacoDeRetorno, esquecerRetornosAoLogin } from '../../auth/lacoDeRetornoAoLogin'
import { navegacaoDoNavegador } from '../../auth/sessaoExpirada'
import { Button } from '../../components/ui/Button'
import { AcessoRecusado } from '../../features/interno/components/EstadoDaSessao'
import { caminhoInternoSeguro } from '../../utils/caminhoInternoSeguro'

const buscaEntrarSchema = z.object({
  destino: z.string().optional(),
})

// Sem formulário de credencial: dispara o redirect hospedado do Keycloak. Irmã de
// `_autenticado.tsx`, nunca filha (senão o guard redirecionaria a própria tela de login).
export const Route = createFileRoute('/interno/entrar')({
  validateSearch: buscaEntrarSchema,
  component: EntrarPage,
})

/** O logout precisa do keycloak-js inicializado; sem ele, o portal é a saída que sempre funciona. */
async function sairDaContaMigrate(): Promise<void> {
  esquecerRetornosAoLogin()
  try {
    await verificarSessao()
    await keycloak.logout({ redirectUri: window.location.origin })
  } catch {
    navegacaoDoNavegador.ir('/')
  }
}

function EntrarPage() {
  const { destino } = Route.useSearch()
  const [falhaRedirect, setFalhaRedirect] = useState(false)
  const [acessoRecusado, setAcessoRecusado] = useState(() => estaEmLacoDeRetorno())

  // A origem é sempre a da própria app: `destino` só escolhe o caminho.
  // A concatenação com `window.location.origin` (literal, nunca derivada de
  // input) é o controle que de fato fecha o open redirect aqui (BAIXO-01):
  // mesmo que `caminhoInternoSeguro` algum dia deixe passar algo inesperado,
  // o resultado vira um *path* dentro do host legítimo, nunca um novo host.
  // NÃO REMOVER esta concatenação ao mexer neste arquivo: é ela, e não só o
  // saneador, que sustenta a garantia (ver comentário em
  // `caminhoInternoSeguro.ts` e AP-SECURITY-010/011).
  const caminhoDestino = caminhoInternoSeguro(destino)
  const redirectUri = `${window.location.origin}${caminhoDestino ?? ''}`

  useEffect(() => {
    if (acessoRecusado) return
    keycloak.login({ redirectUri, locale: IDIOMA_LOGIN }).catch(() => setFalhaRedirect(true))
  }, [redirectUri, acessoRecusado])

  if (acessoRecusado) {
    return (
      <AcessoRecusado
        onSair={sairDaContaMigrate}
        onTentarDeNovo={() => {
          esquecerRetornosAoLogin()
          setAcessoRecusado(false)
        }}
      />
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      {falhaRedirect ? (
        <>
          <p className="text-sm text-muted">
            Não foi possível redirecionar automaticamente para o login.
          </p>
          <Button onClick={() => keycloak.login({ redirectUri, locale: IDIOMA_LOGIN })}>
            Entrar com a conta Migrate
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted" role="status">
          Redirecionando para o login da Migrate…
        </p>
      )}
    </main>
  )
}
