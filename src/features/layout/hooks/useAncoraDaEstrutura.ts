import { useLocation } from '@tanstack/react-router'
import type { ParsedLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  construirIdLinhaEstrutura,
  extrairSlugDaEstruturaDoHash,
} from '../../provedores/utils/destaqueAncora'
import type { AncoraDaEstrutura } from '../utils/linhasDaEstrutura'

export interface OpcoesAncoraDaEstrutura {
  slugAncora: string | null
  ancoras: ReadonlyMap<string, AncoraDaEstrutura>
  /** Precisa ser estável: abre os grupos que escondem a linha. */
  abrirGrupos: (grupos: readonly number[]) => void
  /** Desligado, não mexe na rolagem do histórico nem ouve o hash: a página não tem a âncora. */
  ativo?: boolean
}

/** Cada entrada do histórico tem a sua chave: voltar, avançar e repetir o link contam como chegada. */
function chaveDaNavegacao(local: ParsedLocation): string {
  return `${local.state.__TSR_key ?? ''}|${local.href}`
}

function rolarAteALinha(slug: string) {
  const linha = document.getElementById(construirIdLinhaEstrutura(slug))
  if (!linha) return
  linha.scrollIntoView({ block: 'center' })
  linha.querySelector<HTMLElement>('[data-botao-da-tag]')?.focus({ preventScroll: true })
}

/**
 * Chegada a `#estrutura-{slug}`: abre os grupos, centraliza a linha e foca a tag. A estrutura é a
 * única dona da rolagem; os outros candidatos são neutralizados por ordem, não por tempo.
 */
export function useAncoraDaEstrutura({
  slugAncora,
  ancoras,
  abrirGrupos,
  ativo = true,
}: OpcoesAncoraDaEstrutura): void {
  const chave = useLocation({ select: chaveDaNavegacao })
  const pedidoRef = useRef<{ chave: string; slug: string } | null>(null)
  const [rolagemPendente, setRolagemPendente] = useState(false)

  // Ao voltar ou avançar, o navegador restauraria a rolagem, rolaria até o fragmento e tiraria o foco.
  useEffect(() => {
    if (!ativo) return
    window.history.scrollRestoration = 'manual'
    return () => {
      // Sempre 'auto', o padrão do app: o modo é guardado por entrada do histórico, e ler o valor
      // na montagem pegaria o 'manual' gravado aqui numa visita anterior e o espalharia.
      window.history.scrollRestoration = 'auto'
    }
  }, [ativo])

  useEffect(() => {
    if (!ativo || slugAncora === null) {
      pedidoRef.current = null
      return
    }
    // Re-render ou nova resposta da mesma navegação não rola de novo.
    if (pedidoRef.current?.chave === chave) return

    const ancora = ancoras.get(slugAncora)
    if (!ancora) return

    pedidoRef.current = { chave, slug: slugAncora }
    abrirGrupos(ancora.grupos)
    setRolagemPendente(true)
  }, [ativo, slugAncora, chave, ancoras, abrirGrupos])

  // A linha só existe com os grupos abertos: a rolagem espera o commit do efeito acima.
  useEffect(() => {
    if (!rolagemPendente) return
    if (pedidoRef.current) rolarAteALinha(pedidoRef.current.slug)
    setRolagemPendente(false)
  }, [rolagemPendente])

  // Hash trocado fora do router (barra de endereço): o navegador rola até o fragmento e tira o foco
  // logo antes do `hashchange`. Se a linha ainda não existe, o efeito acima rola depois do commit.
  useEffect(() => {
    if (!ativo) return
    function aoMudarHash() {
      const slug = extrairSlugDaEstruturaDoHash(window.location.hash)
      if (slug !== null) rolarAteALinha(slug)
    }
    window.addEventListener('hashchange', aoMudarHash)
    return () => window.removeEventListener('hashchange', aoMudarHash)
  }, [ativo])
}
