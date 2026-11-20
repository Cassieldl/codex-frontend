const TAGS_EDITAVEIS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Guarda do atalho `Ctrl+K`/`Cmd+K` da barra de comando (§5.D da arquitetura).
 *
 * São duas condições, e a primeira é a que importa: **enquanto houver um diálogo modal aberto, o
 * atalho não passa** - abrir a paleta por cima de um modal de criar/editar apagaria o contexto de
 * quem estava preenchendo. A versão anterior checava apenas o elemento focado, o que deixava
 * passar todo `<button>` do formulário: o `Select` do projeto é `<button role="combobox">`, e
 * "Salvar", "Cancelar" e o `X` do modal também são botões. O resultado eram dois `aria-modal`
 * simultâneos, dois traps de foco disputando o documento e um `Escape` que fechava os dois.
 *
 * A segunda condição continua valendo para quem está digitando num formulário **sem** modal.
 * Campo de busca solto na página (o da tela 11) segue deixando o atalho passar: ali não há
 * contexto a perder.
 */
export function deveIgnorarAtalhoBusca(
  elementoAtivo: Element | null,
  documento: Document = document,
): boolean {
  if (documento.querySelector('[role="dialog"][aria-modal="true"]')) return true

  if (!elementoAtivo) return false

  const editavel =
    TAGS_EDITAVEIS.has(elementoAtivo.tagName) ||
    elementoAtivo.getAttribute('contenteditable') === 'true'

  return editavel && Boolean(elementoAtivo.closest('form'))
}
