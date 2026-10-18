import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import { TITULO_PADRAO, useTituloDaPagina } from './useTituloDaPagina'

function Pagina({ assunto, children }: { assunto: string | null; children?: ReactNode }) {
  useTituloDaPagina(assunto)
  return <>{children}</>
}

beforeEach(() => {
  document.title = TITULO_PADRAO
})

describe('useTituloDaPagina', () => {
  it('põe "<assunto> | Codex" na aba enquanto a página está montada', () => {
    render(<Pagina assunto="Provedores" />)

    expect(document.title).toBe('Provedores | Codex')
  })

  it('volta ao título padrão quando a página sai', () => {
    const { unmount } = render(<Pagina assunto="Provedores" />)
    unmount()

    expect(document.title).toBe(TITULO_PADRAO)
  })

  it('acompanha a troca de assunto sem sobrar o anterior', () => {
    const { rerender } = render(<Pagina assunto="Busca: aliquota" />)
    rerender(<Pagina assunto="Busca: iss retido" />)

    expect(document.title).toBe('Busca: iss retido | Codex')
  })

  it('volta ao padrão quando o assunto deixa de existir (dado recarregando)', () => {
    const { rerender } = render(<Pagina assunto="IPM" />)
    rerender(<Pagina assunto={null} />)

    expect(document.title).toBe(TITULO_PADRAO)
  })

  it('sem assunto não mexe na aba', () => {
    document.title = 'Título de outra tela | Codex'
    render(<Pagina assunto={null} />)

    expect(document.title).toBe('Título de outra tela | Codex')
  })

  it('o filho com assunto vence o pai sem assunto, montados juntos', () => {
    render(
      <Pagina assunto={null}>
        <Pagina assunto="Provedor não encontrado" />
      </Pagina>,
    )

    expect(document.title).toBe('Provedor não encontrado | Codex')
  })

  it('o padrão é o mesmo título do index.html, que vale antes de o React montar', () => {
    const tituloDoIndex = /<title>([^<]+)<\/title>/.exec(indexHtml)?.[1]

    expect(tituloDoIndex).toBe(TITULO_PADRAO)
  })
})
