import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { keycloak } from '../../auth/keycloak'
import { Button } from '../../components/ui/Button'
import { caminhoInternoSeguro } from '../../utils/caminhoInternoSeguro'

const buscaEntrarSchema = z.object({
  destino: z.string().optional(),
})

// Sem formulário de credencial (D1/M18) — dispara o redirect hospedado do
// Keycloak. Irmã de `_autenticado.tsx`, nunca filha (senão o guard
// redirecionaria a própria tela de login).
export const Route = createFileRoute('/interno/entrar')({
  validateSearch: buscaEntrarSchema,
  component: EntrarPage,
})

function EntrarPage() {
  const { destino } = Route.useSearch()
  const [falhaRedirect, setFalhaRedirect] = useState(false)

  // A origem é sempre a da própria app — `destino` só escolhe o caminho.
  // A concatenação com `window.location.origin` (literal, nunca derivada de
  // input) é o controle que de fato fecha o open redirect aqui (BAIXO-01):
  // mesmo que `caminhoInternoSeguro` algum dia deixe passar algo inesperado,
  // o resultado vira um *path* dentro do host legítimo, nunca um novo host.
  // NÃO REMOVER esta concatenação ao mexer neste arquivo — é ela, e não só o
  // saneador, que sustenta a garantia (ver comentário em
  // `caminhoInternoSeguro.ts` e AP-SECURITY-010/011).
  const caminhoDestino = caminhoInternoSeguro(destino)
  const redirectUri = `${window.location.origin}${caminhoDestino ?? ''}`

  useEffect(() => {
    keycloak.login({ redirectUri }).catch(() => setFalhaRedirect(true))
  }, [redirectUri])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      {falhaRedirect ? (
        <>
          <p className="text-sm text-ink/60">
            Não foi possível redirecionar automaticamente para o login.
          </p>
          <Button onClick={() => keycloak.login({ redirectUri })}>
            Entrar com a conta Migrate
          </Button>
        </>
      ) : (
        <p className="text-sm text-ink/60" role="status">
          Redirecionando para o login da Migrate…
        </p>
      )}
    </main>
  )
}
