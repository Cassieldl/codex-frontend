export interface ItemSumarioArtigo {
  nivel: 2 | 3
  titulo: string
  ancora: string
}

const LINHA_TITULO = /^(#{2,3})\s+(.+)$/
// Marcas diacriticas combinantes (U+0300-U+036F), via escape Unicode -- nunca
// caractere literal no codigo-fonte (mesma cautela de M-5 sobre encoding de
// arquivo divergir de forma silenciosa, sem quebrar a compilacao).
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

/**
 * Deriva o ancora de uma secao a partir do titulo (PQ-13 -- derivada, nunca
 * persistida). Exportada para `ConteudoArtigo` aplicar o mesmo `id` nos
 * `h2`/`h3` que renderiza -- e o que faz o link do sumario efetivamente
 * pular para a secao certa; um algoritmo diferente em cada lado quebraria
 * o link silenciosamente.
 */
export function gerarAncoraSecao(titulo: string): string {
  const normalizado = titulo
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `secao-${normalizado}`
}

/**
 * Extrai `h2`/`h3` do Markdown cru via regex de linha (`analise-frontend.md`
 * secao 3.2) -- decisao deliberada de nao instalar `unified`/`remark` como
 * dependencia separada so para achar titulos, ja que `react-markdown` faz o
 * parse completo em `ConteudoArtigo`. Degradacao aceita e documentada: um
 * `##` dentro de um bloco de codigo vira uma entrada a mais no sumario sem
 * secao correspondente -- nao o inverso (nunca perde uma secao real).
 */
export function extrairSecoesDoCorpo(corpo: string): ItemSumarioArtigo[] {
  return corpo
    .split('\n')
    .map((linha) => LINHA_TITULO.exec(linha.trim()))
    .filter((resultado): resultado is RegExpExecArray => resultado !== null)
    .map((resultado) => {
      const titulo = resultado[2]!.trim()
      return {
        nivel: resultado[1]!.length as 2 | 3,
        titulo,
        ancora: gerarAncoraSecao(titulo),
      }
    })
}

export interface SumarioArtigoProps {
  corpo: string
  className?: string
}

/** Sumario lateral do artigo (tela 8, secao 3.6) -- ancoras de pagina, sem "copiar link da secao" (PQ-13). */
export function SumarioArtigo({ corpo, className }: SumarioArtigoProps) {
  const itens = extrairSecoesDoCorpo(corpo)

  if (itens.length === 0) return null

  return (
    <nav aria-label="Sumário do artigo" className={className}>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Nesta página</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {itens.map((item) => (
          <li key={item.ancora} className={item.nivel === 3 ? 'pl-3' : undefined}>
            <a href={`#${item.ancora}`} className="text-sm text-primary-medium hover:underline">
              {item.titulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
