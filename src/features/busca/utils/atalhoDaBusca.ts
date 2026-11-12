export const TECLA_ATALHO_BUSCA = '/'

const TAGS_EDITAVEIS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** O mínimo do evento que a decisão lê: assim o teste monta o caso sem disparar teclado. */
export interface TeclaPressionada {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

function estaEditando(elementoAtivo: Element | null): boolean {
  if (!elementoAtivo) return false
  if (TAGS_EDITAVEIS.has(elementoAtivo.tagName)) return true

  return elementoAtivo.closest('[contenteditable=""], [contenteditable="true"]') !== null
}

/**
 * A tecla "/" leva ao campo de busca do cabeçalho, menos quando quem lê já está digitando (a barra
 * é parte do texto), quando vem com Ctrl, Cmd ou Alt (atalho de outra coisa) e quando há um
 * diálogo aberto por cima. Shift não conta: em alguns teclados a barra só sai com ele.
 */
export function deveFocarBuscaPeloAtalho(
  tecla: TeclaPressionada,
  elementoAtivo: Element | null,
  documento: Document = document,
): boolean {
  if (tecla.key !== TECLA_ATALHO_BUSCA) return false
  if (tecla.ctrlKey || tecla.metaKey || tecla.altKey) return false
  if (estaEditando(elementoAtivo)) return false

  return documento.querySelector('[role="dialog"][aria-modal="true"]') === null
}
