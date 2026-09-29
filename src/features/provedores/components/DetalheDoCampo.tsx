import { CaminhoXml } from '../../../components/ui/CaminhoXml'
import type { CampoVersaoPublico } from '../types/versaoProvedorPagina'

export interface DetalheDoCampoProps {
  campo: CampoVersaoPublico
  id: string
}

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
          <dd className="mt-0.5 text-sm text-ink">
            {atributo.ehCaminho ? <CaminhoXml caminho={atributo.valor!} /> : atributo.valor}
          </dd>
        </div>
      ))}
    </dl>
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
