import clsx from 'clsx'
import { useEffect, useState } from 'react'

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

export interface TopicoSumario extends ItemSumarioArtigo {
  subtopicos: ItemSumarioArtigo[]
}

/**
 * Agrupa cada h3 sob o h2 que vem antes dele. h3 antes de qualquer h2 vira tópico de primeiro
 * nível — o sumário nunca perde uma seção por causa da estrutura do texto.
 */
export function agruparSecoes(itens: ItemSumarioArtigo[]): TopicoSumario[] {
  const topicos: TopicoSumario[] = []
  for (const item of itens) {
    const ultimo = topicos.at(-1)
    if (item.nivel === 3 && ultimo) ultimo.subtopicos.push(item)
    else topicos.push({ ...item, subtopicos: [] })
  }
  return topicos
}

/** Distância do topo da janela a partir da qual um título conta como "a seção em leitura". */
export const LIMIAR_SECAO_ATUAL_PX = 96

/**
 * Âncora da seção em leitura: o último título que já passou do limiar. Antes do primeiro título,
 * nenhuma — o leitor ainda está na introdução.
 */
export function useSecaoAtual(ancoras: string[]): string | null {
  const [atual, setAtual] = useState<string | null>(null)
  const chave = ancoras.join('|')

  useEffect(() => {
    const lista = chave ? chave.split('|') : []
    let quadro = 0

    function medir() {
      quadro = 0
      let encontrada: string | null = null
      // No fim da página o último título nunca chega ao topo: a última seção é a que se lê.
      const raiz = document.documentElement
      if (
        lista.length &&
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >= raiz.scrollHeight - 2
      ) {
        setAtual(lista.at(-1) ?? null)
        return
      }
      for (const ancora of lista) {
        const titulo = document.getElementById(ancora)
        if (titulo && titulo.getBoundingClientRect().top <= LIMIAR_SECAO_ATUAL_PX)
          encontrada = ancora
      }
      setAtual(encontrada)
    }

    function agendar() {
      if (!quadro) quadro = requestAnimationFrame(medir)
    }

    medir()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar)
    return () => {
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
      if (quadro) cancelAnimationFrame(quadro)
    }
  }, [chave])

  return atual
}

export interface SumarioArtigoProps {
  corpo: string
  /** Falso quando quem envolve o sumário já o intitula (o `<summary>` do `<details>` no celular). */
  mostrarTitulo?: boolean
  className?: string
}

function LinkDoSumario({
  item,
  atual,
  nivel,
}: {
  item: ItemSumarioArtigo
  atual: boolean
  nivel: 2 | 3
}) {
  return (
    <a
      href={`#${item.ancora}`}
      aria-current={atual ? 'location' : undefined}
      className={clsx(
        // A barra de 2 px cobre a linha-guia da lista (`-ml-px`): a seção atual fica marcada na
        // própria guia, com o acento laranja de estado ativo.
        '-ml-px block border-l-2 py-1 leading-snug hover:underline',
        nivel === 2 ? 'pl-3 text-sm' : 'pl-6 text-xs',
        atual
          ? 'border-accent font-semibold text-ink'
          : nivel === 2
            ? 'border-transparent text-ink/80'
            : 'border-transparent text-muted',
      )}
    >
      {item.titulo}
    </a>
  )
}

/**
 * Sumário lateral do artigo: tópicos (h2) e subtópicos (h3) numa lista aninhada, sobre uma
 * linha-guia. O subtópico fica mais recuado, menor e mais claro; a seção em leitura é marcada.
 */
export function SumarioArtigo({ corpo, mostrarTitulo = true, className }: SumarioArtigoProps) {
  const itens = extrairSecoesDoCorpo(corpo)
  const secaoAtual = useSecaoAtual(itens.map((item) => item.ancora))

  if (itens.length === 0) return null

  return (
    <nav aria-label="Sumário do artigo" className={className}>
      {mostrarTitulo && (
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Nesta página</p>
      )}
      <ul className={clsx('flex flex-col border-l border-line', mostrarTitulo && 'mt-3')}>
        {agruparSecoes(itens).map((topico) => (
          <li key={topico.ancora}>
            <LinkDoSumario
              item={topico}
              nivel={topico.nivel}
              atual={topico.ancora === secaoAtual}
            />
            {topico.subtopicos.length > 0 && (
              <ul>
                {topico.subtopicos.map((subtopico) => (
                  <li key={subtopico.ancora}>
                    <LinkDoSumario
                      item={subtopico}
                      nivel={3}
                      atual={subtopico.ancora === secaoAtual}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
