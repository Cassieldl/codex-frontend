import { createFileRoute } from '@tanstack/react-router'
import { LayoutIndicePage } from '../../features/layout/routes/layout-index'

// Rota fina (M2) — toda a lógica mora em `features/layout/routes/layout-index.tsx`,
// testável isoladamente sem depender da árvore de rotas gerada.
export const Route = createFileRoute('/layout/')({
  component: LayoutIndicePage,
})
