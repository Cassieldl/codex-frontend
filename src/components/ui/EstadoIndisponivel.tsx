import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina'

export interface EstadoIndisponivelProps {
  icone: LucideIcon
  /** Vira o `h1` da página: este estado substitui o conteúdo inteiro. */
  titulo: string
  /** Assunto do título da aba, ex.: "Provedor não encontrado". */
  tituloDaAba: string
  descricao?: string
  /** Mensagem que a API devolveu, quando houver. */
  motivo?: string
  /** Saídas oferecidas ao leitor (links). */
  children?: ReactNode
}

/**
 * Página que explica por que o conteúdo pedido não está aqui (não existe, saiu
 * do ar, grande demais, endereço incompleto), sempre com um caminho de volta.
 * Base comum das telas de "não existe" de provedor, versão, erro, artigo e
 * Layout InvoiCy.
 */
export function EstadoIndisponivel({
  icone: Icone,
  titulo,
  tituloDaAba,
  descricao,
  motivo,
  children,
}: EstadoIndisponivelProps) {
  useTituloDaPagina(tituloDaAba)

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <Icone aria-hidden="true" className="size-10 text-muted" />
      <h1 className="text-titulo font-semibold text-ink">{titulo}</h1>
      {descricao && <p className="max-w-md text-sm text-muted">{descricao}</p>}
      {motivo && <p className="max-w-md text-xs text-muted">{motivo}</p>}
      {children && (
        <div className="flex flex-wrap items-center justify-center gap-4">{children}</div>
      )}
    </div>
  )
}
