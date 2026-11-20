import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CaminhoXml } from './CaminhoXml'

const CAMINHO = '//Servico/Valores/ValorServicos'

describe('CaminhoXml', () => {
  /**
   * A cópia do caminho é o uso principal da coluna. Se a quebra entrasse como caractere (um
   * hífen, um espaço, uma quebra de linha), o que o integrador colasse no código não seria o
   * caminho. `textContent` é exatamente o que o navegador copia.
   */
  it('preserva o caminho íntegro no texto, sem inserir caractere de quebra', () => {
    const { container } = render(<CaminhoXml caminho={CAMINHO} />)

    expect(container.textContent).toBe(CAMINHO)
  })

  /**
   * Uma oportunidade de quebra por separador ENTRE NÓS - nem menos (o caminho longo transborda a
   * coluna), nem em qualquer posição (`break-all` partia `RazaoSocial` ao meio).
   *
   * As barras do prefixo não contam: quebrar a linha no meio de `//` não ajuda ninguém, e antes
   * elas geravam duas oportunidades inúteis porque o caminho era fatiado por `/` sem distinguir
   * prefixo de separador.
   */
  it('oferece quebra depois de cada separador entre nós, e só ali', () => {
    const { container } = render(<CaminhoXml caminho={CAMINHO} />)

    // `//Servico/Valores/ValorServicos` → entre Servico|Valores e entre Valores|ValorServicos.
    expect(container.querySelectorAll('wbr')).toHaveLength(2)
    expect(container.querySelector('span')?.className).not.toContain('break-all')
  })

  /**
   * O `//` é sintaxe de XPath, não informação: abre a leitura e leva a atenção antes do primeiro
   * nome. Ele continua no texto (quem copia precisa do caminho exato), mas recua visualmente.
   */
  it('atenua o prefixo, sem tirá-lo do texto', () => {
    const { container } = render(<CaminhoXml caminho={CAMINHO} />)

    const prefixo = [...container.querySelectorAll('span')].find(
      (span) => span.textContent === '//',
    )

    expect(prefixo).toBeDefined()
    expect(prefixo?.className).not.toContain('text-ink')
  })

  /**
   * O último segmento é o campo; o resto é onde ele mora. Com tudo no mesmo peso, o leitor
   * percorre `//Servico/Valores/ValorServicos` caractere a caractere até achar o que importa.
   *
   * A asserção é sobre qual segmento recebe o destaque, não sobre a classe em si: trocar o tom
   * é decisão de estilo, destacar o ancestral em vez do campo é o defeito.
   */
  it('destaca o último segmento, que é o nome do campo', () => {
    const { container } = render(<CaminhoXml caminho={CAMINHO} />)

    const destacados = [...container.querySelectorAll('span')]
      .filter((span) => span.className.includes('font-semibold'))
      .map((span) => span.textContent)

    expect(destacados).toEqual(['ValorServicos'])
  })

  /**
   * O tamanho é UMA classe: `clsx` não faz merge, então aplicar as duas deixaria `text-[13px]` e
   * `text-[15px]` no mesmo elemento, e quem vence é a ordem no CSS gerado.
   */
  it('tamanho "destaque" usa só text-[15px]', () => {
    const { container } = render(<CaminhoXml caminho={CAMINHO} tamanho="destaque" />)
    const classes = container.firstElementChild?.className ?? ''

    expect(classes).toContain('text-[15px]')
    expect(classes).not.toContain('text-[13px]')
  })

  it('tamanho padrão (explícito ou omitido) usa só text-[13px]', () => {
    const omitido = render(<CaminhoXml caminho={CAMINHO} />).container.firstElementChild
    const explicito = render(<CaminhoXml caminho={CAMINHO} tamanho="padrao" />).container
      .firstElementChild

    for (const elemento of [omitido, explicito]) {
      expect(elemento?.className).toContain('text-[13px]')
      expect(elemento?.className).not.toContain('text-[15px]')
    }
  })

  it('o tamanho não altera o texto copiado', () => {
    const { container } = render(<CaminhoXml caminho={CAMINHO} tamanho="destaque" />)

    expect(container.textContent).toBe(CAMINHO)
  })

  /** Caminho sem separador nenhum não ganha ponto de quebra - não há onde quebrar bem. */
  it('não insere quebra em caminho de segmento único', () => {
    const { container } = render(<CaminhoXml caminho="Rps" />)

    expect(container.textContent).toBe('Rps')
    expect(container.querySelectorAll('wbr')).toHaveLength(0)
  })
})

/**
 * Guarda estrutural: `--color-border` é token de BORDA (#dce5ec). Como cor de texto sobre branco ele
 * dá **1,28:1** - bem abaixo de qualquer mínimo legível.
 *
 * O detector de contraste do projeto mede os pares declarados no CSS, então uma combinação escrita
 * direto no componente (`className="text-border"`) passa por baixo dele. Aconteceu aqui: a primeira
 * versão deste componente pintou o prefixo e as barras assim, e a suíte inteira ficou verde.
 */
describe('nenhum componente usa token de borda como cor de texto', () => {
  const FONTES = import.meta.glob('../../**/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  })

  function arquivosDeProducao(): string[] {
    return Object.keys(FONTES).filter((caminho) => !caminho.endsWith('.test.tsx'))
  }

  it('a varredura enxerga componentes e features', () => {
    const caminhos = arquivosDeProducao()

    // Sem contar o universo, um glob que parasse de casar deixaria o caso abaixo passar por vazio.
    // São ~138 arquivos de produção em `src/` (componentes e features); o piso tolera remoções.
    expect(caminhos.length).toBeGreaterThanOrEqual(130)
    expect(caminhos.some((caminho) => caminho.startsWith('./'))).toBe(true)
    expect(caminhos.some((caminho) => caminho.includes('/features/'))).toBe(true)
  })

  // Casa a classe em qualquer lugar da fonte, não só em `className=`: classes também moram em
  // constantes e templates, e a versão restrita ao atributo deixava essas passarem.
  it('não usa text-border em lugar nenhum', () => {
    const comTextoIlegivel = arquivosDeProducao().filter((caminho) =>
      /(?<![\w-])text-border(?![\w-])/.test(FONTES[caminho]),
    )

    expect(comTextoIlegivel).toEqual([])
  })
})
