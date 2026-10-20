import { useEffect, useRef } from 'react'

export interface ErroDoServidorProps {
  mensagem?: string | null
}

/**
 * Erro de servidor no topo de um formulário. Num formulário longo o clique em Salvar acontece no
 * fim do modal rolável, e o aviso ficaria fora da tela: ao ganhar mensagem, ele rola até ficar
 * visível.
 */
export function ErroDoServidor({ mensagem }: ErroDoServidorProps) {
  const alertaRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!mensagem) return
    // O jsdom não implementa `scrollIntoView`; o navegador sempre tem.
    alertaRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [mensagem])

  if (!mensagem) return null

  return (
    <p ref={alertaRef} role="alert" className="text-sm text-error-texto">
      {mensagem}
    </p>
  )
}
