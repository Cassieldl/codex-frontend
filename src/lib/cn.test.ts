import { describe, expect, it } from 'vitest'
import cssGlobal from '../styles/global.css?raw'
import { cn, TOKENS_DO_TEMA } from './cn'

describe('cn', () => {
  it('tamanho de texto do tema não apaga a cor, nem a cor apaga o tamanho', () => {
    expect(cn('text-corpo', 'text-primary')).toBe('text-corpo text-primary')
    expect(cn('text-primary', 'text-titulo')).toBe('text-primary text-titulo')
  })

  it('duas cores conflitantes: fica só a última', () => {
    expect(cn('text-primary', 'text-foreground')).toBe('text-foreground')
  })

  it('raio e sombra do tema entram no grupo certo', () => {
    expect(cn('rounded-[var(--radius-aviso)]', 'rounded-pill')).toBe('rounded-pill')
    expect(cn('shadow-card', 'shadow-primary')).toBe('shadow-card shadow-primary')
  })

  it('aceita condicional por objeto e array e descarta valores falsos', () => {
    expect(
      cn('px-2', ['py-1', false, null], { 'font-semibold': true, italic: false }, undefined),
    ).toBe('px-2 py-1 font-semibold')
  })

  // Token novo no `@theme` sem registro no `cn` volta a ser lido como cor e apaga classes em silêncio.
  it('todo token de tamanho, entrelinha, raio e sombra do global.css está registrado', () => {
    const registrados = Object.entries(TOKENS_DO_TEMA).flatMap(([grupo, nomes]) =>
      nomes.map((nome) => `${grupo}-${nome}`),
    )
    const doCss = [...cssGlobal.matchAll(/--(text|leading|radius|shadow)-([a-z0-9-]+):/g)]
      .filter(([, , nome]) => !nome.includes('--'))
      .map(([, grupo, nome]) => `${grupo}-${nome}`)

    expect(doCss.length).toBeGreaterThan(15)
    expect(doCss.filter((token) => !registrados.includes(token))).toEqual([])
  })
})
