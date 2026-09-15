import { TriangleAlert } from 'lucide-react'
import { Button } from './Button'

export interface ErrorStateProps {
  message?: string
  onRetry: () => void
  /**
   * Põe o foco no botão de tentar de novo. Default , e de propósito: roubar o foco só faz
   * sentido quando o erro ocupa a tela inteira. Numa busca ao vivo o erro chega **enquanto o
   * usuário digita**, e o salto engole os caracteres seguintes; dentro de um modal, o foco roubado
   * ainda impede o diálogo de devolver o foco ao gatilho quando fecha.
   */
  autoFocusRetry?: boolean
}

const MENSAGEM_PADRAO = 'Não foi possível carregar esta informação agora.'

export function ErrorState({
  message = MENSAGEM_PADRAO,
  onRetry,
  autoFocusRetry = false,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
      <TriangleAlert aria-hidden="true" className="size-10 text-error" />
      <p className="text-sm text-ink/60">{message}</p>
      <Button variant="secondary" onClick={onRetry} autoFocus={autoFocusRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}
