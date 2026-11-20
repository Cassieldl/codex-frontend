import clsx from 'clsx'
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
      <span className="text-alert-info-borda">{ehFechamento ? '</' : '<'}</span>
      <span className="text-white">{nome}</span>
      <span className="text-alert-info-borda">{'>'}</span>
    </>
  )
}

function montarLinhas(niveis: string[], exemplo: string | null): LinhaDoXml[] {
  const indiceDoAlvo = niveis.length - 1
  const ancestrais = niveis.slice(0, indiceDoAlvo)
  const tagDoAlvo = niveis[indiceDoAlvo]

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
          <span className="text-codigo-valor">{exemplo}</span>
        ) : (
          <span className="text-alert-info-borda">…</span>
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
 * linha quebre em vez de rolar para o lado. Mora no bloco escuro de exemplo do modal do campo.
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
        className="py-1 font-mono text-[12.5px] leading-6"
      >
        {linhas.map((linha) => (
          <code
            key={linha.chave}
            data-linha
            data-nivel={linha.nivel}
            data-alvo={linha.ehAlvo ? '' : undefined}
            style={{ paddingLeft: `${linha.nivel + 1}rem` }}
            className={clsx(
              'block border-l-[3px] pr-4 whitespace-pre-wrap [overflow-wrap:anywhere]',
              linha.ehAlvo ? 'border-l-accent bg-white/10 font-semibold' : 'border-l-transparent',
            )}
          >
            {linha.conteudo}
          </code>
        ))}
      </div>

      {temExemplo && (
        <figcaption className="mt-1 text-xs text-alert-info-borda">exemplo real</figcaption>
      )}
    </figure>
  )
}
