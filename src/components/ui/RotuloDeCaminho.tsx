import { Fragment } from 'react'

export interface RotuloDeCaminhoProps {
  texto: string
}

/**
 * Rótulo feito de caminho (`Servico/Valores/IBSCBS/TribRegular`) que quebra de linha na barra.
 *
 * Sem espaço, o caminho inteiro é uma palavra só: não cabe numa coluna estreita e estoura o
 * contêiner, ou, com `overflow-wrap: anywhere`, quebra no meio do nome (`TribRegula` / `r`). A barra
 * é a junta natural - o `<wbr>` depois dela marca onde quebrar, sem trocar nenhum caractere, então
 * o texto copiado continua sendo o caminho exato. Quem usa ainda deve pôr `overflow-wrap:anywhere`
 * no contêiner, para o segmento que sozinho não couber.
 */
export function RotuloDeCaminho({ texto }: RotuloDeCaminhoProps) {
  const segmentos = texto.split('/')

  return (
    <>
      {segmentos.map((segmento, indice) => (
        <Fragment key={indice}>
          {indice > 0 && (
            <>
              /<wbr />
            </>
          )}
          {segmento}
        </Fragment>
      ))}
    </>
  )
}
