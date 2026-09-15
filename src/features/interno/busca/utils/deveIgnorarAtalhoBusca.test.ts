import { afterEach, describe, expect, it } from 'vitest'
import { deveIgnorarAtalhoBusca } from './deveIgnorarAtalhoBusca'

function montar(html: string): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  return container
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('deveIgnorarAtalhoBusca', () => {
  it('bloqueia o atalho dentro de campo de formulário aberto', () => {
    const container = montar('<form><input id="titulo" /><textarea id="corpo"></textarea></form>')

    expect(deveIgnorarAtalhoBusca(container.querySelector('#titulo'))).toBe(true)
    expect(deveIgnorarAtalhoBusca(container.querySelector('#corpo'))).toBe(true)
  })

  it('deixa passar em campo de busca solto, fora de formulário', () => {
    const container = montar('<div><input id="busca" /></div>')

    expect(deveIgnorarAtalhoBusca(container.querySelector('#busca'))).toBe(false)
  })

  it('deixa passar em elemento não editável, mesmo dentro de formulário', () => {
    const container = montar('<form><button id="salvar">Salvar</button></form>')

    expect(deveIgnorarAtalhoBusca(container.querySelector('#salvar'))).toBe(false)
  })

  it('sem elemento focado (body), o atalho vale', () => {
    expect(deveIgnorarAtalhoBusca(null)).toBe(false)
  })

  it('bloqueia área contenteditable dentro de formulário', () => {
    const container = montar('<form><div id="editor" contenteditable="true"></div></form>')

    expect(deveIgnorarAtalhoBusca(container.querySelector('#editor'))).toBe(true)
  })
})

describe('deveIgnorarAtalhoBusca — diálogo aberto tem precedência', () => {
  function documentoCom(html: string): Document {
    const documento = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
    return documento
  }

  it('bloqueia com um modal aberto, mesmo com o foco num botão do formulário', () => {
    // O caso que a guarda antiga deixava passar: o `Select` do projeto é
    // `<button role="combobox">`, e "Salvar"/"Cancelar" também são botões — nenhum deles é
    // TAG_EDITAVEL, então o atalho abria a paleta por cima do formulário.
    const documento = documentoCom(
      '<div role="dialog" aria-modal="true"><form><button id="combo" role="combobox">Severidade</button></form></div>',
    )

    expect(deveIgnorarAtalhoBusca(documento.querySelector('#combo'), documento)).toBe(true)
  })

  it('bloqueia com modal aberto mesmo sem nada focado', () => {
    const documento = documentoCom('<div role="dialog" aria-modal="true"><form></form></div>')

    expect(deveIgnorarAtalhoBusca(null, documento)).toBe(true)
  })

  it('deixa passar em botão solto na página, sem modal', () => {
    const documento = documentoCom('<button id="acao">Publicar</button>')

    expect(deveIgnorarAtalhoBusca(documento.querySelector('#acao'), documento)).toBe(false)
  })

  it('deixa passar em campo de busca solto — não há contexto a perder (tela 11)', () => {
    const documento = documentoCom('<input id="busca" type="search" />')

    expect(deveIgnorarAtalhoBusca(documento.querySelector('#busca'), documento)).toBe(false)
  })
})
