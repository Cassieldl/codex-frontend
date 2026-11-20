import { useEffect, useState } from 'react'

/**
 * Devolve `valor` só depois que ele fica parado por `atrasoMs` - usado por
 * `/busca` (§7.1) para não disparar a query nem sincronizar a URL a cada
 * tecla digitada.
 */
export function useDebounce<T>(valor: T, atrasoMs: number): T {
  const [valorComAtraso, setValorComAtraso] = useState(valor)

  useEffect(() => {
    const temporizador = setTimeout(() => setValorComAtraso(valor), atrasoMs)
    return () => clearTimeout(temporizador)
  }, [valor, atrasoMs])

  return valorComAtraso
}
