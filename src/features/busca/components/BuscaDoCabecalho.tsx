import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { deveFocarBuscaPeloAtalho, TECLA_ATALHO_BUSCA } from '../utils/atalhoDaBusca'
import { CampoBusca } from './CampoBusca'

/**
 * Busca compacta do cabeçalho das páginas públicas. Enter abre `/busca?q=termo`; termo em branco
 * não navega. A tecla "/" foca o campo de qualquer ponto da página.
 */
export function BuscaDoCabecalho() {
  const navigate = useNavigate()
  const [termo, setTermo] = useState('')
  const campoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (!deveFocarBuscaPeloAtalho(evento, document.activeElement)) return

      // Sem isso a própria barra entraria no campo recém-focado.
      evento.preventDefault()
      campoRef.current?.focus()
    }

    // Em `document`, não em `window`: o ouvinte some junto com a árvore que o registrou.
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [])

  function buscar() {
    const termoLimpo = termo.trim()
    if (!termoLimpo) return

    void navigate({ to: '/busca', search: { q: termoLimpo } })
  }

  return (
    <CampoBusca
      valor={termo}
      onValorChange={setTermo}
      onSubmit={buscar}
      variante="compacta"
      placeholder="Erro, campo ou provedor"
      campoRef={campoRef}
      atalhoTeclado={TECLA_ATALHO_BUSCA}
    />
  )
}
