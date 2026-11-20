import { createFileRoute } from '@tanstack/react-router'
import { ArtigoDetalheRota } from '../../features/artigos/routes/artigo-detalhe-rota'

// Rota fina (§3) - a lógica mora em `features/artigos/routes/` (artigo-detalhe-rota.tsx liga o
// parâmetro à página; artigo-detalhe.tsx é a página), testável sem depender da árvore gerada.
export const Route = createFileRoute('/artigos/$artigoSlug')({
  component: ArtigoDetalheRota,
})
