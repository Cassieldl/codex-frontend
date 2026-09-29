import { Link } from '@tanstack/react-router'
import { ArchiveX, CircleHelp, Layers } from 'lucide-react'

export type VarianteProvedorIndisponivel =
  | 'provedor-nao-encontrado'
  | 'provedor-despublicado'
  | 'versao-nao-encontrada'
  | 'versao-despublicada'
  | 'versao-grande-demais'

export interface EstadoProvedorIndisponivelProps {
  /**
   * `*-nao-encontrado` (404) — nada existiu nesse endereço.
   * `*-despublicado` (410) — existiu e saiu do ar.
   * `versao-grande-demais` (422) — a versão passou do teto de campos que a
   * página pública monta de uma vez; insistir não resolve.
   */
  variante: VarianteProvedorIndisponivel
  /** Slug do provedor, quando há um provedor válido para onde voltar. */
  provedorSlug?: string
}

const CONTEUDO: Record<VarianteProvedorIndisponivel, { titulo: string; descricao: string }> = {
  'provedor-nao-encontrado': {
    titulo: 'Este provedor não existe.',
    descricao: 'Não encontramos nenhum provedor publicado neste endereço.',
  },
  'provedor-despublicado': {
    titulo: 'Este provedor saiu do ar.',
    descricao: 'O conteúdo deste provedor não está mais disponível publicamente.',
  },
  'versao-nao-encontrada': {
    titulo: 'Esta versão não existe.',
    descricao: 'Não encontramos nenhuma versão publicada deste provedor neste endereço.',
  },
  'versao-despublicada': {
    titulo: 'Esta versão saiu do ar.',
    descricao: 'O conteúdo desta versão não está mais disponível publicamente.',
  },
  'versao-grande-demais': {
    titulo: 'Esta versão é grande demais para abrir aqui.',
    descricao:
      'Ela passou do número de campos que esta página monta de uma vez. Fale com o atendimento para receber o conteúdo completo.',
  },
}

const ICONE: Record<VarianteProvedorIndisponivel, typeof CircleHelp> = {
  'provedor-nao-encontrado': CircleHelp,
  'provedor-despublicado': ArchiveX,
  'versao-nao-encontrada': CircleHelp,
  'versao-despublicada': ArchiveX,
  'versao-grande-demais': Layers,
}

/**
 * `404`/`410`/`422` das páginas de provedor e de versão — página que **explica**,
 * como já fazem artigo e erro. Antes, os três casos caíam no `ErrorState`
 * genérico: "Não foi possível carregar esta informação agora. / Tentar
 * novamente" — que promete que insistir resolve, quando o endereço não existe,
 * saiu do ar, ou é grande demais. O leitor ficava clicando.
 *
 * A saída muda com o caso: havendo provedor válido, volta para as versões dele;
 * senão, para a lista de provedores, que é de onde se chega a qualquer um.
 */
export function EstadoProvedorIndisponivel({
  variante,
  provedorSlug,
}: EstadoProvedorIndisponivelProps) {
  const { titulo, descricao } = CONTEUDO[variante]
  const Icone = ICONE[variante]
  const ehDeVersao = variante.startsWith('versao-')

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <Icone aria-hidden="true" className="size-10 text-muted" />
      <h1 className="text-titulo font-semibold text-ink">{titulo}</h1>
      <p className="max-w-md text-sm text-muted">{descricao}</p>

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
    </div>
  )
}
