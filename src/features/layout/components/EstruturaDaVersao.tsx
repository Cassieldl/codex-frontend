import { useId } from 'react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { rotuloParaNomeDeArquivo } from '../../../utils/baixarArquivoDeTexto'
import type { CampoNaSequencia } from '../../../utils/blocosDoLayout'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import { ErroEstruturaIndisponivel } from '../hooks/useEstruturaLayout'
import { ROTULO_DO_FORMATO } from '../types/estruturaLayout'
import type { EstruturaLayout, FormatoDaEstrutura } from '../types/estruturaLayout'
import type { CampoLayoutPublico } from '../types/layoutPublico'
import type { FormatosDoCampo } from '../utils/formatosDoCampoNaEstrutura'
import { VisualizadorDaEstrutura } from './VisualizadorDaEstrutura'

export interface EstruturaDaVersaoProps {
  formato: FormatoDaEstrutura
  versaoSlug: string
  versaoRotulo: string
  estrutura: EstruturaLayout | undefined
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  camposPorSlug: ReadonlyMap<string, CampoNaSequencia<CampoLayoutPublico>>
  formatosDoCampo: FormatosDoCampo
  slugAncora: string | null
  origemUrl: string
}

/**
 * Painel de um formato da estrutura. A falha fica dentro do painel: o dicionário, na outra aba,
 * não depende desta consulta.
 */
export function EstruturaDaVersao({
  formato,
  versaoSlug,
  versaoRotulo,
  estrutura,
  isLoading,
  error,
  onRetry,
  camposPorSlug,
  formatosDoCampo,
  slugAncora,
  origemUrl,
}: EstruturaDaVersaoProps) {
  const tituloId = useId()
  const rotuloDoFormato = ROTULO_DO_FORMATO[formato]
  const raiz = estrutura?.[formato]

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id={tituloId} className="text-subtitulo font-semibold text-ink">
          Estrutura {rotuloDoFormato}
        </h2>
        <p className="text-sm text-muted">
          O envio completo da {formatarVersaoLayout(versaoRotulo)}, com um valor de exemplo em cada
          tag.
        </p>
      </header>

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Carregando a estrutura…</span>
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {error instanceof ErroEstruturaIndisponivel && (
        <EmptyState
          message={`A estrutura ${rotuloDoFormato} desta versão estará disponível em breve. Consulte os campos na visão Dicionário.`}
        />
      )}

      {error && !(error instanceof ErroEstruturaIndisponivel) && <ErrorState onRetry={onRetry} />}

      {!isLoading && !error && raiz && raiz.filhos.length === 0 && (
        <EmptyState message={`A estrutura ${rotuloDoFormato} desta versão está vazia.`} />
      )}

      {!isLoading && !error && raiz && raiz.filhos.length > 0 && (
        <VisualizadorDaEstrutura
          key={formato}
          raiz={raiz}
          formato={formato}
          destino={{
            tipo: 'verbete',
            versaoSlug,
            versaoRotulo,
            camposPorSlug,
            formatosDoCampo,
            slugAncora,
            origemUrl,
          }}
          nomeBaseDoArquivo={`layout-invoicy-${rotuloParaNomeDeArquivo(versaoRotulo)}`}
          rotuloDaRegiao={`Texto da estrutura ${rotuloDoFormato}`}
          rotuloDaCopia={`Copiar a estrutura ${rotuloDoFormato} completa`}
        />
      )}
    </section>
  )
}
