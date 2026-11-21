import { useCallback, useState } from 'react'

/**
 * Página atual de uma listagem filtrada. Trocar busca, filtro ou ordenação devolve a página 1 já
 * no mesmo render, sem buscar antes a página antiga com o filtro novo.
 */
export function usePaginaPorFiltros(chaveDosFiltros: string): [number, (pagina: number) => void] {
  const [escolha, setEscolha] = useState({ chave: chaveDosFiltros, pagina: 1 })

  // Ajuste durante o render, padrão do React para estado derivado de prop que mudou.
  if (escolha.chave !== chaveDosFiltros) {
    setEscolha({ chave: chaveDosFiltros, pagina: 1 })
  }

  const pagina = escolha.chave === chaveDosFiltros ? escolha.pagina : 1

  const irParaPagina = useCallback(
    (novaPagina: number) => setEscolha({ chave: chaveDosFiltros, pagina: novaPagina }),
    [chaveDosFiltros],
  )

  return [pagina, irParaPagina]
}
