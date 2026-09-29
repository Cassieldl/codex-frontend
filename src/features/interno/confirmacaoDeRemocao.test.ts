import { describe, expect, it } from 'vitest'

/**
 * Guarda estrutural da área interna: toda tela que oferece remoção tem de confirmar antes.
 *
 * O contrato está escrito no próprio `ModalConfirmacao` — "remoção é irreversível pela interface,
 * então nunca dispara direto do clique na lista" — e mesmo assim **cinco** das sete telas com
 * remoção disparavam o DELETE no clique; duas confirmavam. A regra existia e a aplicação nunca
 * fechou a classe.
 *
 * Teste por tela não resolveria: cobriria as cinco já encontradas e deixaria a próxima nascer
 * errada. Esta varredura falha para qualquer arquivo novo que ganhe um botão de remover sem o
 * diálogo — que é a regressão que se quer impedir.
 *
 * A varredura é por **sítio do efeito** (o rótulo acessível que toda ação destrutiva desta área
 * usa), não por uma expressão que alguém lembrou de procurar. Os arquivos vêm do código de
 * produção via `?raw`, nunca de uma cópia.
 */
const FONTES = import.meta.glob('./**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** `aria-label={`Remover ...`}` — o rótulo padrão das ações destrutivas da área interna. */
const ACAO_DE_REMOCAO = /aria-label=\{`Remover /

/**
 * Remover uma linha de formulário ainda não salvo (uma variante de mensagem, por exemplo) não
 * toca o servidor: desfazer é digitar de novo. Só a remoção persistida exige confirmação.
 */
const FORMULARIOS_EM_MEMORIA = ['/erros/components/ErroForm.tsx']

function arquivosComRemocao(): string[] {
  return Object.entries(FONTES)
    .filter(([caminho]) => !caminho.endsWith('.test.tsx'))
    .filter(([caminho]) => !FORMULARIOS_EM_MEMORIA.some((isento) => caminho.endsWith(isento)))
    .filter(([, conteudo]) => ACAO_DE_REMOCAO.test(conteudo))
    .map(([caminho]) => caminho)
    .sort()
}

describe('área interna — confirmação antes de remover', () => {
  it('a varredura enxerga as telas com ação de remoção', () => {
    // Sem este caso, um glob que parasse de casar deixaria o teste abaixo passar por vazio — e a
    // guarda viraria decoração sem ninguém perceber.
    expect(arquivosComRemocao().length).toBeGreaterThanOrEqual(7)
  })

  it('toda tela com remoção usa ModalConfirmacao', () => {
    const semConfirmacao = arquivosComRemocao().filter(
      (caminho) => !FONTES[caminho].includes('ModalConfirmacao'),
    )

    expect(semConfirmacao).toEqual([])
  })
})
