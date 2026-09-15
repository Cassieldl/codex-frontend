import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { CabecalhoPublico } from '../components/layout/CabecalhoPublico'
import { RodapeContextual } from '../components/layout/RodapeContextual'
import { CampoBusca } from '../features/busca/components/CampoBusca'

const TERMO_MINIMO = 2

// Placeholder mínimo (M3) — campo de busca + acesso a provedores, só o
// suficiente para o roteamento ter uma rota pública real. Não investir
// design: a Home definitiva (tela 1) é da demanda 002 e substitui este
// arquivo por inteiro (FRONT-2a completa, não recria — M32).
export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = Route.useNavigate()
  const [termo, setTermo] = useState('')

  function aoBuscar() {
    if (termo.trim().length < TERMO_MINIMO) return
    navigate({ to: '/busca', search: { q: termo } })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <CabecalhoPublico />

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-extrabold text-ink">Codex</h1>
          <p className="max-w-md text-sm text-ink/60">
            Portal técnico de integração NFS-e da Migrate — busque pelo código do erro, a mensagem
            recebida ou o nome do provedor.
          </p>
        </div>

        <div className="w-full max-w-xl">
          <CampoBusca valor={termo} onValorChange={setTermo} onSubmit={aoBuscar} autoFocus />
        </div>

        <Link
          to="/provedores"
          search={{ pagina: 1 }}
          className="text-sm font-semibold text-primary-medium hover:underline"
        >
          Ver todos os provedores
        </Link>
      </main>

      <RodapeContextual contexto={{ tipo: 'home' }} />
    </div>
  )
}
