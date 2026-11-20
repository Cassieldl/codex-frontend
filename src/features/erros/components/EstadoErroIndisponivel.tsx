import { Link } from '@tanstack/react-router'
import { ArchiveX, CircleHelp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EstadoIndisponivel } from '../../../components/ui/EstadoIndisponivel'

type VarianteErroIndisponivel = 'nao-encontrado' | 'despublicado'

export interface EstadoErroIndisponivelProps {
  /**
   * `nao-encontrado` (404): nenhum erro jamais existiu nesse endereço.
   * `despublicado` (410): o erro existiu, foi documentado, mas saiu do ar.
   * São mensagens **distintas** para o leitor, nunca a mesma tela.
   */
  variante: VarianteErroIndisponivel
  /** Slug tentado, usado para pré-preencher a busca de recuperação. */
  slugTentado: string
  /** Mensagem que a API devolveu no envelope de erro, se houver (410). */
  motivo?: string
}

const CONTEUDO: Record<
  VarianteErroIndisponivel,
  { icone: LucideIcon; titulo: string; tituloDaAba: string; descricao: string }
> = {
  'nao-encontrado': {
    icone: CircleHelp,
    titulo: 'Este erro não existe.',
    tituloDaAba: 'Erro não encontrado',
    descricao: 'Confira o endereço ou busque pelo código do erro.',
  },
  despublicado: {
    icone: ArchiveX,
    titulo: 'Este erro saiu do ar.',
    tituloDaAba: 'Erro fora do ar',
    descricao: 'Busque pelo código do erro para ver o conteúdo atual.',
  },
}

/**
 * `404`/`410` da página do erro: página que **explica**, nunca `404` mudo nem
 * redirect silencioso para a home. Oferece busca pré-preenchida com o slug
 * tentado como caminho de recuperação.
 */
export function EstadoErroIndisponivel({
  variante,
  slugTentado,
  motivo,
}: EstadoErroIndisponivelProps) {
  return (
    <EstadoIndisponivel {...CONTEUDO[variante]} motivo={motivo}>
      <Link
        to="/busca"
        search={{ q: slugTentado }}
        className="text-sm font-semibold text-primary-medium hover:underline"
      >
        Buscar “{slugTentado}”
      </Link>
    </EstadoIndisponivel>
  )
}
