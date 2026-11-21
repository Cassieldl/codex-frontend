import { extendTailwindMerge } from 'tailwind-merge'

type ClassValue =
  string | number | boolean | null | undefined | ClassValue[] | { [key: string]: unknown }

// Tokens do `global.css` fora da escala do Tailwind; sem eles, `text-corpo` vira cor.
export const TOKENS_DO_TEMA = {
  text: ['aux', 'corpo', 'card-titulo', 'subtitulo', 'secao', 'titulo', 'h1', 'hero'],
  leading: ['titulo', 'corpo'],
  radius: ['input', 'control', 'check', 'aviso', 'card', 'pill'],
  shadow: ['hover', 'card', 'panel'],
}

const mesclarClasses = extendTailwindMerge({
  extend: { theme: TOKENS_DO_TEMA },
})

function achatar(valor: ClassValue): string {
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor)
  if (!valor || valor === true) return ''
  if (Array.isArray(valor)) return valor.map(achatar).filter(Boolean).join(' ')

  return Object.entries(valor)
    .filter(([, condicao]) => Boolean(condicao))
    .map(([classe]) => classe)
    .join(' ')
}

/** Junta classes condicionais e resolve conflito do Tailwind: a última classe do grupo vence. */
export function cn(...entradas: ClassValue[]): string {
  return mesclarClasses(entradas.map(achatar).filter(Boolean).join(' '))
}
