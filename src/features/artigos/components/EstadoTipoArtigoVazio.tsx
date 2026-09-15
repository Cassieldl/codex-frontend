import { Inbox, SearchX } from 'lucide-react'
import type { TipoArtigo } from '../types/artigo'
import { ROTULO_TIPO_ARTIGO } from './EtiquetaTipoArtigo'

export type VarianteTipoArtigoVazio = 'sem-acervo' | 'sem-resultado'

export interface EstadoTipoArtigoVazioProps {
  /**
   * `sem-acervo` — a aba do tipo existe, mas nenhum artigo desse tipo foi
   * publicado ainda (estado **nomeado**, não é busca sem resultado).
   * `sem-resultado` — há acervo do tipo, mas nada casa com o termo buscado.
   */
  variante: VarianteTipoArtigoVazio
  tipo: TipoArtigo
}

const CONTEUDO: Record<VarianteTipoArtigoVazio, (rotulo: string) => [string, string]> = {
  'sem-acervo': (rotulo) => [
    `Ainda não há artigo de ${rotulo} publicado.`,
    'O acervo cresce a partir dos chamados: quando uma explicação se repete, ela vira artigo.',
  ],
  'sem-resultado': (rotulo) => [
    `Nenhum artigo de ${rotulo} corresponde à sua busca.`,
    'O tipo continua aqui para você saber que ele existe.',
  ],
}

/**
 * Vazio do índice de artigos (§2.1). Os dois casos são textos **distintos**:
 * "o tipo existe e está vazio" é informação editorial (o leitor precisa saber
 * que o tipo existe), enquanto "a busca não casou" é um resultado de filtro.
 * Colapsar os dois num `EmptyState` genérico apagaria essa diferença.
 */
export function EstadoTipoArtigoVazio({ variante, tipo }: EstadoTipoArtigoVazioProps) {
  const [titulo, descricao] = CONTEUDO[variante](ROTULO_TIPO_ARTIGO[tipo])
  const Icone = variante === 'sem-acervo' ? Inbox : SearchX

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Icone aria-hidden="true" className="size-10 text-muted" />
      <p className="text-card-titulo font-medium text-ink">{titulo}</p>
      <p className="max-w-md text-sm text-ink/60">{descricao}</p>
    </div>
  )
}
