import { createFileRoute } from '@tanstack/react-router'
import { ErroDetalheRota } from '../../features/erros/routes/erro-detalhe-rota'

// Rota fina (§7.2) — a lógica mora em `features/erros/routes/` (erro-detalhe-rota.tsx liga o
// parâmetro à página; erro-detalhe.tsx é a página), testável sem depender da árvore gerada.
export const Route = createFileRoute('/erros/$erroSlug')({
  component: ErroDetalheRota,
})
