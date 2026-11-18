import { useParams } from '@tanstack/react-router'
import { useProvedorPorSlug } from '../hooks/useProvedorPorSlug'
import type { AbaProvedor } from '../utils/abasDoProvedor'
import { ProvedorIndexConteudo } from './provedor-index'

/**
 * Conteúdo de uma aba do provedor. Lê o slug da rota pai e reusa a consulta que a moldura
 * (`route.tsx`) já carregou, sem requisição a mais.
 */
export function ProvedorAbaRota({ aba }: { aba: AbaProvedor }) {
  const { provedorSlug } = useParams({ from: '/provedores/$provedorSlug' })
  const { data: provedor } = useProvedorPorSlug(provedorSlug)

  if (!provedor) return null

  return (
    <ProvedorIndexConteudo
      provedorSlug={provedorSlug}
      provedorNome={provedor.nome}
      versoes={provedor.versoes}
      avisosDoProvedor={provedor.avisos}
      aba={aba}
    />
  )
}
