import { createFileRoute } from '@tanstack/react-router'
import { ProvedorLayoutRota } from '../../../features/provedores/routes/provedor-layout-rota'

// Rota fina - a lógica mora em `features/provedores/routes/` (provedor-layout-rota.tsx liga os
// parâmetros à página; provedor-layout.tsx é a página), testável sem depender da árvore gerada
// (mesmo padrão de `routes/artigos/$artigoSlug.tsx` e `routes/erros/$erroSlug.tsx`).
export const Route = createFileRoute('/provedores/$provedorSlug')({
  component: ProvedorLayoutRota,
})
