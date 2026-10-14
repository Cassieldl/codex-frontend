import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'

export interface DestinoDeNavegacao {
  href: string
  replace: boolean
}

/**
 * Navegação das páginas de detalhe para o caminho canônico que o backend devolveu. A identidade
 * da função é estável entre renders: o efeito de redirecionamento depende dela e entraria em laço
 * com uma função nova a cada render.
 */
export function useNavegarParaCanonica(): (destino: DestinoDeNavegacao) => void {
  const navigate = useNavigate()

  return useCallback(
    ({ href, replace }: DestinoDeNavegacao) => {
      void navigate({ to: href, replace } as unknown as Parameters<typeof navigate>[0])
    },
    [navigate],
  )
}
