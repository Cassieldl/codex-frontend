import { Button } from './Button'
import { Modal } from './Modal'

export interface ModalConfirmacaoProps {
  isOpen: boolean
  /** Ex.: "Remover exemplo". */
  title: string
  /** O que será feito, com o nome do item — quem confirma precisa ver o que some. */
  message: string
  confirmLabel?: string
  isConfirming?: boolean
  /** Mensagem de falha da própria ação, exibida sem fechar o diálogo. */
  erro?: string | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmação de ação destrutiva. Remoção é irreversível pela interface, então
 * nunca dispara direto do clique na lista — e a falha (409 de `etag` velho, 403
 * de permissão) aparece aqui, em vez de o item simplesmente continuar na tela
 * sem explicação.
 */
export function ModalConfirmacao({
  isOpen,
  title,
  message,
  confirmLabel = 'Remover',
  isConfirming = false,
  erro = null,
  onConfirm,
  onCancel,
}: ModalConfirmacaoProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-ink">{message}</p>

        {erro && (
          <p role="alert" className="text-sm text-error-texto">
            {erro}
          </p>
        )}

        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isConfirming}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} isLoading={isConfirming} disabled={isConfirming}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
