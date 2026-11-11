import { createFileRoute } from '@tanstack/react-router'
import { redirecionarVersaoParaProvedor } from '../../../features/provedores/routes/redirecionar-versao'

// Só mantém vivos os links antigos com versão: redireciona antes de montar qualquer tela.
export const Route = createFileRoute('/provedores/$provedorSlug/$versaoSlug')({
  beforeLoad: redirecionarVersaoParaProvedor,
})
