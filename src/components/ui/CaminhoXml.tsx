import clsx from 'clsx'
import { Fragment } from 'react'

export interface CaminhoXmlProps {
  caminho: string
  className?: string
}

/** `//Prestador/RazaoSocial` → prefixo `//` + `['Prestador', 'RazaoSocial']`. */
function separar(caminho: string): { prefixo: string; segmentos: string[] } {
  const prefixo = caminho.match(/^\/+/)?.[0] ?? ''

  return { prefixo, segmentos: caminho.slice(prefixo.length).split('/') }
}

/**
 * Caminho no XML, lido como trilha em vez de string de código.
 *
 * Três coisas atrapalhavam, e nenhuma era o conteúdo. A barra tinha a mesma cor e o mesmo corpo dos
 * nomes, então `//Servico/Valores/ValorServicos` chegava como um bloco só, sem junta visível. O
 * `//` da frente é sintaxe, não informação — mas abre a leitura e leva a atenção primeiro. E o nó
 * que interessa, o último, dependia só do peso da fonte para se separar dos ancestrais.
 *
 * Aqui as barras ganham respiro, os ancestrais ficam em cinza e o nó final recebe peso e tinta
 * cheia. A hierarquia aparece **sem trocar nenhum caractere**: quem seleciona e copia continua
 * levando o caminho exato, e é por isso que a barra não virou `›`.
 *
 * A separação vem do PESO e do espaçamento, nunca de apagar a barra: sobre branco, um cinza claro
 * o bastante para "sumir" fica em 1,2:1 — ilegível para quem enxerga pouco, num caminho técnico em
 * que cada caractere conta. `--color-line` é token de borda e não serve como cor de texto; o mais
 * claro que passa AA aqui já é praticamente o `--color-muted` usado nos ancestrais.
 *
 * A quebra continua só nos separadores (`<wbr>`): `break-all` partia `RazaoSoc`/`ial` ao meio, e
 * sem quebra nenhuma um caminho longo transborda a coluna.
 */
export function CaminhoXml({ caminho, className }: CaminhoXmlProps) {
  const { prefixo, segmentos } = separar(caminho)
  const indiceDoNo = segmentos.length - 1

  return (
    <span className={clsx('font-mono text-[13px] leading-6', className)}>
      {prefixo && <span className="text-muted">{prefixo}</span>}

      {segmentos.map((segmento, indice) => (
        // A chave é posicional de propósito: segmentos repetidos no mesmo caminho são comuns
        // (`//Servico/Valores/Valores`) e o conteúdo não os distingue.
        <Fragment key={indice}>
          {indice > 0 && <span className="mx-1 text-muted">/</span>}
          <span className={indice === indiceDoNo ? 'font-semibold text-ink' : 'text-muted'}>
            {segmento}
          </span>
          {indice < indiceDoNo && <wbr />}
        </Fragment>
      ))}
    </span>
  )
}
