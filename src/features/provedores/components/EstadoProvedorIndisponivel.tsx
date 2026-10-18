import { Link } from '@tanstack/react-router'
import { ArchiveX, CircleHelp, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EstadoIndisponivel } from '../../../components/ui/EstadoIndisponivel'

export type VarianteProvedorIndisponivel =
  | 'provedor-nao-encontrado'
  | 'provedor-despublicado'
  | 'versao-nao-encontrada'
  | 'versao-despublicada'
  | 'versao-grande-demais'

export interface EstadoProvedorIndisponivelProps {
  /**
   * `*-nao-encontrado` (404): nada existiu nesse endereço.
   * `*-despublicado` (410): existiu e saiu do ar.
   * `versao-grande-demais` (422): a versão passou do teto de campos que a
   * página pública monta de uma vez; insistir não resolve.
   */
  variante: VarianteProvedorIndisponivel
  /** Slug do provedor, quando há um provedor válido para onde voltar. */
  provedorSlug?: string
}

interface ConteudoDaVariante {
  icone: LucideIcon
  titulo: string
  tituloDaAba: string
  descricao: string
}

const CONTEUDO: Record<VarianteProvedorIndisponivel, ConteudoDaVariante> = {
  'provedor-nao-encontrado': {
    icone: CircleHelp,
    titulo: 'Este provedor não existe.',
    tituloDaAba: 'Provedor não encontrado',
    descricao: 'Não encontramos nenhum provedor publicado neste endereço.',
  },
  'provedor-despublicado': {
    icone: ArchiveX,
    titulo: 'Este provedor saiu do ar.',
    tituloDaAba: 'Provedor fora do ar',
    descricao: 'O conteúdo deste provedor não está mais disponível publicamente.',
  },
  'versao-nao-encontrada': {
    icone: CircleHelp,
    titulo: 'Esta versão não existe.',
    tituloDaAba: 'Versão não encontrada',
    descricao: 'Não encontramos nenhuma versão publicada deste provedor neste endereço.',
  },
  'versao-despublicada': {
    icone: ArchiveX,
    titulo: 'Esta versão saiu do ar.',
    tituloDaAba: 'Versão fora do ar',
    descricao: 'O conteúdo desta versão não está mais disponível publicamente.',
  },
  'versao-grande-demais': {
    icone: Layers,
    titulo: 'Esta versão é grande demais para abrir aqui.',
    tituloDaAba: 'Versão grande demais para exibir',
    descricao:
      'Ela passou do número de campos que esta página monta de uma vez. Fale com o atendimento para receber o conteúdo completo.',
  },
}

/**
 * `404`/`410`/`422` das páginas de provedor e de versão: página que **explica**,
 * nunca o `ErrorState` genérico, que promete que insistir resolve.
 *
 * A saída muda com o caso: havendo provedor válido, volta para as versões dele;
 * senão, para a lista de provedores, que é de onde se chega a qualquer um.
 */
export function EstadoProvedorIndisponivel({
  variante,
  provedorSlug,
}: EstadoProvedorIndisponivelProps) {
  const ehDeVersao = variante.startsWith('versao-')

  return (
    <EstadoIndisponivel {...CONTEUDO[variante]}>
      {ehDeVersao && provedorSlug ? (
        <Link
          to="/provedores/$provedorSlug"
          params={{ provedorSlug }}
          className="text-sm font-semibold text-primary-medium hover:underline"
        >
          Ver outras versões deste provedor
        </Link>
      ) : (
        <Link
          to="/provedores"
          search={{ pagina: 1 }}
          className="text-sm font-semibold text-primary-medium hover:underline"
        >
          Ver todos os provedores
        </Link>
      )}
    </EstadoIndisponivel>
  )
}
