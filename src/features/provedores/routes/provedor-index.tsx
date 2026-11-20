import { Link } from '@tanstack/react-router'
import { FileX } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useTituloDaPagina } from '../../../hooks/useTituloDaPagina'
import type { AvisoPublico, VersaoProvedorResumo } from '../types/provedor'
import type { AbaProvedor } from '../utils/abasDoProvedor'
import { VersaoProvedorPage } from './versao-provedor'

export interface ProvedorIndexConteudoProps {
  provedorSlug: string
  provedorNome: string
  versoes: VersaoProvedorResumo[]
  avisosDoProvedor: AvisoPublico[]
  aba: AbaProvedor
}

const MENSAGEM_SEM_CONTEUDO = 'O conteúdo deste provedor estará disponível em breve.'

function ProvedorSemConteudo({ provedorNome }: { provedorNome: string }) {
  useTituloDaPagina(provedorNome)

  return (
    <EmptyState
      message={MENSAGEM_SEM_CONTEUDO}
      icon={<FileX className="size-10" />}
      action={
        <Link
          to="/provedores"
          search={{ pagina: 1 }}
          className="text-sm font-semibold text-primary-medium hover:underline"
        >
          Ver todos os provedores
        </Link>
      }
    />
  )
}

/**
 * Conteúdo de uma aba de `/provedores/{slug}`: a versão publicada aberta direto, sem escolha. P3 entrega as
 * versões da mais nova para a mais antiga, então a primeira é a que vale. Fica fora do arquivo de
 * rota para ser testável sem a árvore gerada.
 */
export function ProvedorIndexConteudo({
  provedorSlug,
  provedorNome,
  versoes,
  avisosDoProvedor,
  aba,
}: ProvedorIndexConteudoProps) {
  const [versaoPublicada] = versoes

  if (!versaoPublicada) return <ProvedorSemConteudo provedorNome={provedorNome} />

  return (
    <VersaoProvedorPage
      provedorSlug={provedorSlug}
      versaoSlug={versaoPublicada.slug}
      aba={aba}
      avisosDoProvedor={avisosDoProvedor}
    />
  )
}
