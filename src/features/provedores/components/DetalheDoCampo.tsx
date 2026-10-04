import clsx from 'clsx'

import { CaminhoXml } from '../../../components/ui/CaminhoXml'
import type { CampoVersaoPublico } from '../types/versaoProvedorPagina'

export interface DetalheDoCampoProps {
  campo: CampoVersaoPublico
  id: string
}

/**
 * Separador entre destinos quando um campo alimenta mais de uma tag do provedor — o país da
 * prestação que também vira o país do resultado, o CEP que serve ao endereço nacional e ao do
 * exterior. É a forma como a carga de conteúdo grava `destinoXml`.
 */
export const SEPARADOR_DE_DESTINOS = ' | '

/** Um atributo do campo, na ordem em que a leitura precisa dele. */
interface AtributoExibido {
  rotulo: string
  valor: string | null
  /** Caminho no XML tem apresentação própria; texto corrido, não. */
  ehCaminho?: boolean
  /** Ocupa a linha inteira — textos longos não cabem em coluna estreita. */
  largo?: boolean
}

/**
 * Atributos do campo que a tabela não tem largura para mostrar.
 *
 * Eram oito valores que o editor preenchia na área interna e o leitor nunca via — inclusive o
 * <b>destino no XML</b>, que o artboard da tela de provedor pede explicitamente, e a
 * <b>condição</b>, que a etiqueta "Condicional" promete na tabela sem nunca dizer qual é. Quem
 * precisava deles abria um chamado.
 *
 * Só entra o que está preenchido: uma lista de oito trações não informa nada e faz o leitor
 * duvidar de que valha abrir a próxima linha.
 */
export function DetalheDoCampo({ campo, id }: DetalheDoCampoProps) {
  const atributos: AtributoExibido[] = [
    { rotulo: 'Significado', valor: campo.significado, largo: true },
    { rotulo: 'Condição', valor: campo.condicao, largo: true },
    { rotulo: 'Máscara', valor: campo.mascara },
    { rotulo: 'Domínio', valor: campo.dominio },
    { rotulo: 'Exemplo', valor: campo.exemplo },
    { rotulo: 'Destino no XML do provedor', valor: campo.destinoXml, ehCaminho: true },
    { rotulo: 'Nota de preenchimento', valor: campo.notaPreenchimento, largo: true },
    { rotulo: 'Nota de transformação', valor: campo.notaTransformacao, largo: true },
  ]

  const preenchidos = atributos.filter(
    (atributo) => atributo.valor !== null && atributo.valor !== '',
  )

  return (
    <dl id={id} className="grid grid-cols-1 gap-x-8 gap-y-3 px-5 py-4 sm:grid-cols-2">
      {preenchidos.map((atributo) => (
        <div key={atributo.rotulo} className={atributo.largo ? 'sm:col-span-2' : undefined}>
          <dt className="text-xs font-medium text-muted">{atributo.rotulo}</dt>
          {/* Texto corrido mantém as quebras de linha: as notas chegam em parágrafos. */}
          <dd
            className={clsx(
              'mt-0.5 text-sm text-ink',
              !atributo.ehCaminho && 'whitespace-pre-line',
            )}
          >
            {atributo.ehCaminho ? <Destinos valor={atributo.valor!} /> : atributo.valor}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Um caminho por destino. Passar os destinos juntos ao `CaminhoXml` misturaria o separador com o
 * nome de uma tag e destacaria só a última como "o nó" — a leitura sairia errada justamente no campo
 * que vai para dois lugares.
 */
function Destinos({ valor }: { valor: string }) {
  const destinos = valor.split(SEPARADOR_DE_DESTINOS)
  if (destinos.length === 1) return <CaminhoXml caminho={valor} />

  return (
    <ul className="flex flex-col gap-1">
      {destinos.map((destino) => (
        <li key={destino}>
          <CaminhoXml caminho={destino} />
        </li>
      ))}
    </ul>
  )
}

/** Se há algo para mostrar — sem isso, a linha ofereceria abrir um painel vazio. */
export function campoTemDetalhe(campo: CampoVersaoPublico): boolean {
  return [
    campo.significado,
    campo.condicao,
    campo.mascara,
    campo.dominio,
    campo.exemplo,
    campo.destinoXml,
    campo.notaPreenchimento,
    campo.notaTransformacao,
  ].some((valor) => valor !== null && valor !== '')
}
