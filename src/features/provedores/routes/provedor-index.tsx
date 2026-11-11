import { FileX } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import type { VersaoProvedorResumo } from '../types/provedor'
import { VersaoProvedorPage } from './versao-provedor'

export interface ProvedorIndexConteudoProps {
  provedorSlug: string
  provedorNome: string
  versoes: VersaoProvedorResumo[]
}

const MENSAGEM_SEM_CONTEUDO = 'Este provedor ainda não tem conteúdo publicado.'

function ProvedorSemConteudo({ provedorNome }: { provedorNome: string }) {
  useTituloDaPagina(provedorNome)

  return <EmptyState message={MENSAGEM_SEM_CONTEUDO} icon={<FileX className="size-10" />} />
}

/**
 * Conteúdo de `/provedores/{slug}`: a versão publicada aberta direto, sem escolha. P3 entrega as
 * versões da mais nova para a mais antiga, então a primeira é a que vale. Fica fora do arquivo de
 * rota para ser testável sem a árvore gerada.
 */
export function ProvedorIndexConteudo({
  provedorSlug,
  provedorNome,
  versoes,
}: ProvedorIndexConteudoProps) {
  const [versaoPublicada] = versoes

  if (!versaoPublicada) return <ProvedorSemConteudo provedorNome={provedorNome} />

  return <VersaoProvedorPage provedorSlug={provedorSlug} versaoSlug={versaoPublicada.slug} />
}
