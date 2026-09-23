import { Link } from '@tanstack/react-router'
import { ArchiveX, CircleHelp } from 'lucide-react'

export interface EstadoErroIndisponivelProps {
  /**
   * `nao-encontrado` (404) — nenhum erro jamais existiu nesse endereço.
   * `despublicado` (410) — o erro existiu, foi documentado, mas saiu do ar
   * (M7). São mensagens **distintas** para o leitor, nunca a mesma tela.
   */
  variante: 'nao-encontrado' | 'despublicado'
  /** Slug tentado — usado para pré-preencher a busca de recuperação. */
  slugTentado: string
  /** Mensagem que a API devolveu no envelope de erro, se houver (410). */
  motivo?: string
}

const CONTEUDO: Record<
  EstadoErroIndisponivelProps['variante'],
  { titulo: string; descricao: string }
> = {
  'nao-encontrado': {
    titulo: 'Este erro não existe.',
    descricao: 'Não encontramos nenhum erro documentado neste endereço.',
  },
  despublicado: {
    titulo: 'Este erro saiu do ar.',
    descricao:
      'Este erro já foi documentado, mas não está mais publicado — pode ter sido substituído ou descontinuado.',
  },
}

/**
 * `404`/`410` da página do erro (M7) — página que **explica**, nunca `404`
 * mudo nem redirect silencioso para a home. Oferece busca pré-preenchida com
 * o slug tentado como caminho de recuperação.
 */
export function EstadoErroIndisponivel({
  variante,
  slugTentado,
  motivo,
}: EstadoErroIndisponivelProps) {
  const { titulo, descricao } = CONTEUDO[variante]
  const Icone = variante === 'nao-encontrado' ? CircleHelp : ArchiveX

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <Icone aria-hidden="true" className="size-10 text-muted" />
      <h1 className="text-titulo font-semibold text-ink">{titulo}</h1>
      <p className="max-w-md text-sm text-muted">{descricao}</p>
      {motivo && <p className="max-w-md text-xs text-muted">{motivo}</p>}
      <Link
        to="/busca"
        search={{ q: slugTentado }}
        className="text-sm font-semibold text-primary-medium hover:underline"
      >
        Buscar “{slugTentado}”
      </Link>
    </div>
  )
}
