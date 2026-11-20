import { Link } from '@tanstack/react-router'
import { ArchiveX, CircleHelp, PencilRuler } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EstadoIndisponivel } from '../../../components/ui/EstadoIndisponivel'

export type VarianteArtigoIndisponivel = 'nao-encontrado' | 'despublicado' | 'reservado-ausente'

export interface EstadoArtigoIndisponivelProps {
  /**
   * `nao-encontrado` (404): nenhum artigo existiu nesse endereço.
   * `despublicado` (410): o artigo existiu e saiu do ar.
   * `reservado-ausente` (404 no slug reservado): o conteúdo obrigatório ainda
   * não foi escrito; a rota existe porque é navegação, não dado.
   *
   * `reservado-ausente` nunca deriva de `410`: o backend bloqueia despublicar
   * artigo reservado, então esse caso é bug de servidor e não é mascarado aqui.
   */
  variante: VarianteArtigoIndisponivel
  /** Slug tentado, usado para pré-preencher a busca de recuperação. */
  slugTentado: string
  /** Mensagem que a API devolveu no envelope de erro, se houver (410). */
  motivo?: string
}

const CONTEUDO: Record<
  VarianteArtigoIndisponivel,
  { icone: LucideIcon; titulo: string; tituloDaAba: string; descricao: string }
> = {
  'nao-encontrado': {
    icone: CircleHelp,
    titulo: 'Este artigo não existe.',
    tituloDaAba: 'Artigo não encontrado',
    descricao: 'Confira o endereço ou busque pelo assunto do artigo.',
  },
  despublicado: {
    icone: ArchiveX,
    titulo: 'Este artigo saiu do ar.',
    tituloDaAba: 'Artigo fora do ar',
    descricao: 'Busque pelo assunto para encontrar o conteúdo atual.',
  },
  'reservado-ausente': {
    icone: PencilRuler,
    titulo: 'Este conteúdo estará disponível em breve.',
    tituloDaAba: 'Conteúdo em breve',
    descricao: 'Use a busca para encontrar erros, campos e provedores.',
  },
}

/**
 * `404`/`410` da página do artigo: página que **explica**, nunca `404` mudo nem
 * redirect silencioso para a home.
 *
 * O CTA do caso reservado vai para a busca **sem termo**: "buscar
 * 'como-funciona'" não significa nada para o leitor, que chegou ali pelo menu.
 */
export function EstadoArtigoIndisponivel({
  variante,
  slugTentado,
  motivo,
}: EstadoArtigoIndisponivelProps) {
  const reservado = variante === 'reservado-ausente'

  return (
    <EstadoIndisponivel {...CONTEUDO[variante]} motivo={motivo}>
      {reservado ? (
        <Link
          to="/busca"
          search={{ q: '' }}
          className="text-sm font-semibold text-primary-medium hover:underline"
        >
          Ir para a busca
        </Link>
      ) : (
        <Link
          to="/busca"
          search={{ q: slugTentado }}
          className="text-sm font-semibold text-primary-medium hover:underline"
        >
          Buscar “{slugTentado}”
        </Link>
      )}
    </EstadoIndisponivel>
  )
}
