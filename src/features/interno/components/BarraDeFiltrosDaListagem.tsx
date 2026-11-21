import type { ReactNode } from 'react'
import { AlternadorSegmentado } from '../../../components/ui/AlternadorSegmentado'
import { Input } from '../../../components/ui/Input'
import {
  FILTROS_DE_PUBLICACAO,
  ROTULO_DO_FILTRO_DE_PUBLICACAO,
  type FiltroDePublicacao,
} from '../utils/filtroDePublicacao'

export interface BarraDeFiltrosDaListagemProps {
  termo: string
  onTermoChange: (termo: string) => void
  placeholderDaBusca: string
  publicacao: FiltroDePublicacao
  onPublicacaoChange: (publicacao: FiltroDePublicacao) => void
  /** Filtro próprio da tela, entre a busca e a publicação (origem em Erros, tipo em Artigos). */
  children?: ReactNode
}

/** Busca, filtro próprio e estado de publicação acima de uma tabela interna, todos com 36 px. */
export function BarraDeFiltrosDaListagem({
  termo,
  onTermoChange,
  placeholderDaBusca,
  publicacao,
  onPublicacaoChange,
  children,
}: BarraDeFiltrosDaListagemProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-64 flex-1">
        <Input
          label="Buscar"
          type="search"
          value={termo}
          placeholder={placeholderDaBusca}
          onChange={(evento) => onTermoChange(evento.target.value)}
          className="bg-white"
        />
      </div>

      {children}

      <div className="flex flex-col">
        {/* O grupo já tem nome acessível; o texto visível só alinha com os rótulos vizinhos. */}
        <span aria-hidden="true" className="mb-1 text-xs text-ink lg:text-sm">
          Publicação
        </span>
        <AlternadorSegmentado
          rotulo="Publicação"
          opcoes={FILTROS_DE_PUBLICACAO}
          rotuloDaOpcao={ROTULO_DO_FILTRO_DE_PUBLICACAO}
          selecionada={publicacao}
          onSelecionar={onPublicacaoChange}
          tamanho="compacto"
          className="ring-1 ring-border"
        />
      </div>
    </div>
  )
}
