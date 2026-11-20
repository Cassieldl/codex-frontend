/**
 * Alvo do "pular para o conteúdo". Exportado para que cada página use ESTE valor no seu `<main>`
 * em vez de repetir a string: um id digitado à mão em doze páginas é um link quebrado esperando
 * acontecer, e link de pulo quebrado falha em silêncio - o foco simplesmente não vai a lugar
 * nenhum.
 */
export const ID_CONTEUDO_PRINCIPAL = 'conteudo-principal'

/**
 * WCAG 2.4.1 (Bypass Blocks, nível A). Portal e área interna abrem com marca, navegação e, em
 * várias telas, o campo de busca: sem isto, quem navega por teclado atravessa tudo de novo a cada
 * página antes de alcançar o conteúdo.
 *
 * Precisa ser o **primeiro elemento focável do documento** (depois do logo já não serve para
 * pular nada), e `focus:not-sr-only` é o que o traz para a tela ao receber foco. Sem esse par,
 * o link existe, é focável e continua invisível: pior que não ter, porque some sem avisar.
 */
export function PularParaConteudo() {
  return (
    <a
      href={`#${ID_CONTEUDO_PRINCIPAL}`}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-medium focus:shadow-panel"
    >
      Pular para o conteúdo
    </a>
  )
}
