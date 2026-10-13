import type { ReactNode } from 'react'

import { niveisDoCaminho } from '../utils/destinosXml'

export interface XmlDoDestinoProps {
  caminho: string
  /** Valor real do campo; ausente, a folha mostra `…` e a nota "exemplo real" some. */
  exemplo: string | null
}

interface LinhaDoXml {
  chave: string
  nivel: number
  ehAlvo: boolean
  conteudo: ReactNode
}

function Tag({ nome, ehFechamento = false }: { nome: string; ehFechamento?: boolean }) {
  return (
    <>
      <span className="text-muted">{ehFechamento ? '</' : '<'}</span>
      <span className="text-primary-medium">{nome}</span>
      <span className="text-muted">{'>'}</span>
    </>
  )
}

function montarLinhas(niveis: string[], exemplo: string | null): LinhaDoXml[] {
  const indiceDoAlvo = niveis.length - 1
  const ancestrais = niveis.slice(0, indiceDoAlvo)
  const tagDoAlvo = niveis[indiceDoAlvo]!

  const aberturas = ancestrais.map((tag, nivel) => ({
    chave: `abre-${nivel}`,
    nivel,
    ehAlvo: false,
    conteudo: <Tag nome={tag} />,
  }))

  const alvo = {
    chave: 'alvo',
    nivel: indiceDoAlvo,
    ehAlvo: true,
    conteudo: (
      <>
        <Tag nome={tagDoAlvo} />
        {exemplo ? (
          <span className="text-ink">{exemplo}</span>
        ) : (
          <span className="text-muted">…</span>
        )}
        <Tag nome={tagDoAlvo} ehFechamento />
      </>
    ),
  }

  const fechamentos = ancestrais
    .map((tag, nivel) => ({
      chave: `fecha-${nivel}`,
      nivel,
      ehAlvo: false,
      conteudo: <Tag nome={tag} ehFechamento />,
    }))
    .reverse()

  return [...aberturas, alvo, ...fechamentos]
}

/**
 * O caminho de um destino lido como XML aninhado: ancestrais abertos, a folha com o valor dentro e o
 * fechamento invertido. O recuo é de linha continuada (`padding-left`), não de espaços, para que a
 * linha quebre em vez de rolar para o lado.
 */
export function XmlDoDestino({ caminho, exemplo }: XmlDoDestinoProps) {
  const niveis = niveisDoCaminho(caminho)
  if (niveis.length === 0) return null

  const temExemplo = exemplo !== null && exemplo !== ''
  const linhas = montarLinhas(niveis, temExemplo ? exemplo : null)

  return (
    <figure>
      <div
        role="group"
        aria-label={`Caminho no XML do provedor: ${caminho}`}
        className="rounded-[var(--radius-control)] bg-surface-hover py-3 font-mono text-[12.5px] leading-7"
      >
        {linhas.map((linha) => (
          <code
            key={linha.chave}
            data-linha
            data-nivel={linha.nivel}
            data-alvo={linha.ehAlvo ? '' : undefined}
            style={{ paddingLeft: `${linha.nivel + 1}rem` }}
            className={
              linha.ehAlvo
                ? 'block border-l-[3px] border-l-accent bg-highlight-anchor pr-4 font-semibold whitespace-pre-wrap [overflow-wrap:anywhere]'
                : 'block border-l-[3px] border-l-transparent pr-4 whitespace-pre-wrap [overflow-wrap:anywhere]'
            }
          >
            {linha.conteudo}
          </code>
        ))}
      </div>

      {temExemplo && <figcaption className="mt-1 text-xs text-muted">exemplo real</figcaption>}
    </figure>
  )
}
