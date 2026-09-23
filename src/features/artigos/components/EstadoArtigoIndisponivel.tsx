import { Link } from '@tanstack/react-router'
import { ArchiveX, CircleHelp, PencilRuler } from 'lucide-react'

export type VarianteArtigoIndisponivel = 'nao-encontrado' | 'despublicado' | 'reservado-ausente'

export interface EstadoArtigoIndisponivelProps {
  /**
   * `nao-encontrado` (404) — nenhum artigo existiu nesse endereço.
   * `despublicado` (410) — o artigo existiu e saiu do ar.
   * `reservado-ausente` (404 no slug reservado) — o conteúdo obrigatório
   * ainda não foi escrito; a rota existe porque é navegação, não dado (§4.1).
   *
   * `reservado-ausente` nunca deriva de `410`: o backend bloqueia despublicar
   * artigo reservado (I28), então esse caso é bug de servidor — não é
   * mascarado aqui.
   */
  variante: VarianteArtigoIndisponivel
  /** Slug tentado — usado para pré-preencher a busca de recuperação. */
  slugTentado: string
  /** Mensagem que a API devolveu no envelope de erro, se houver (410). */
  motivo?: string
}

const CONTEUDO: Record<VarianteArtigoIndisponivel, { titulo: string; descricao: string }> = {
  'nao-encontrado': {
    titulo: 'Este artigo não existe.',
    descricao: 'Não encontramos nenhum artigo publicado neste endereço.',
  },
  despublicado: {
    titulo: 'Este artigo saiu do ar.',
    descricao:
      'Este artigo já foi publicado, mas não está mais disponível — pode ter sido substituído ou descontinuado.',
  },
  'reservado-ausente': {
    titulo: 'Este conteúdo ainda não foi publicado.',
    descricao: 'A página existe no menu, mas o texto ainda está sendo escrito.',
  },
}

const ICONE: Record<VarianteArtigoIndisponivel, typeof CircleHelp> = {
  'nao-encontrado': CircleHelp,
  despublicado: ArchiveX,
  'reservado-ausente': PencilRuler,
}

/**
 * `404`/`410` da página do artigo (§3.4) — página que **explica**, nunca `404`
 * mudo nem redirect silencioso para a home.
 *
 * O CTA do caso reservado vai para a busca **sem termo**: "buscar
 * 'como-funciona'" não significa nada para o leitor, que chegou ali pelo menu.
 */
export function EstadoArtigoIndisponivel({
  variante,
  slugTentado,
  motivo,
}: EstadoArtigoIndisponivelProps) {
  const { titulo, descricao } = CONTEUDO[variante]
  const Icone = ICONE[variante]
  const reservado = variante === 'reservado-ausente'

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <Icone aria-hidden="true" className="size-10 text-muted" />
      <h1 className="text-titulo font-semibold text-ink">{titulo}</h1>
      <p className="max-w-md text-sm text-muted">{descricao}</p>
      {motivo && <p className="max-w-md text-xs text-muted">{motivo}</p>}

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
    </div>
  )
}
