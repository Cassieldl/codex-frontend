import { ArrowDown, TriangleAlert } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import { PainelCaminhoInvoicy } from '../../../components/ui/PainelCaminhoInvoicy'
import type { CampoVersaoPublico, ErroResumoPublico } from '../types/versaoProvedorPagina'
import { separarDestinos } from '../utils/destinosXml'
import { RejeicoesDoCampo } from './RejeicoesDoCampo'
import { XmlDoDestino } from './XmlDoDestino'

export interface ConteudoDoCampoProps {
  campo: CampoVersaoPublico
  errosResumo: ErroResumoPublico[]
}

const ROTULO_DE_SECAO = 'text-aux font-semibold tracking-wide text-muted uppercase'

function preenchido(valor: string | null): valor is string {
  return valor !== null && valor !== ''
}

function CartaoDeResumo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-control)] bg-surface-hover px-3 py-2.5">
      <dt className={ROTULO_DE_SECAO}>{rotulo}</dt>
      <dd className="mt-1 text-sm text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

function ResumoDoCampo({ campo }: { campo: CampoVersaoPublico }) {
  const quantidadeDeRejeicoes = campo.errosConhecidos.length

  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <CartaoDeResumo rotulo="Tipo">{campo.tipo}</CartaoDeResumo>

      <CartaoDeResumo rotulo="Tamanho">
        {campo.tamanho ?? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">não informado</span>
          </>
        )}
      </CartaoDeResumo>

      <CartaoDeResumo rotulo="Exemplo">
        {preenchido(campo.exemplo) ? (
          <span className="font-mono">{campo.exemplo}</span>
        ) : (
          <span className="text-muted italic">sem exemplo real</span>
        )}
      </CartaoDeResumo>

      <CartaoDeResumo rotulo="Rejeições">
        {quantidadeDeRejeicoes > 0 ? (
          <span className="inline-flex items-center gap-1 font-semibold text-severidade-alerta-texto">
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            {quantidadeDeRejeicoes}
          </span>
        ) : (
          <span className="text-muted">nenhuma</span>
        )}
      </CartaoDeResumo>
    </dl>
  )
}

function ConectorParaOProvedor() {
  return (
    <div aria-hidden="true" className="flex flex-col items-center gap-0.5">
      <ArrowDown className="size-5 text-primary" />
      <span className="text-xs font-semibold text-primary">vira, no provedor</span>
    </div>
  )
}

function PainelNoXmlDoProvedor({ campo }: { campo: CampoVersaoPublico }) {
  const tituloId = useId()
  const destinos = separarDestinos(campo.destinoXml)
  const quantidadeDeTags = destinos.filter((destino) => destino.tipo === 'caminho').length
  // O exemplo é do campo, não de uma tag: só entra no XML quando há um único destino. Em dois ou
  // mais, escolher a tag que o recebe seria inventar o exemplo da outra.
  const exemploDoDestino = destinos.length === 1 ? campo.exemplo : null

  return (
    <section
      aria-labelledby={tituloId}
      className="rounded-[var(--radius-card)] border border-border p-4"
    >
      <h3 id={tituloId} className={ROTULO_DE_SECAO}>
        No XML do provedor
      </h3>

      {destinos.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Este campo não tem destino no XML do provedor.</p>
      ) : (
        <>
          {quantidadeDeTags >= 2 && (
            <p className="mt-2 text-xs text-muted">
              Este campo alimenta {quantidadeDeTags} tags do XML do provedor.
            </p>
          )}

          <ul className="mt-2 flex flex-col gap-3">
            {destinos.map((destino, indice) =>
              destino.tipo === 'omitidos' ? (
                <li key={`omitidos-${indice}`} className="text-sm text-muted">
                  e mais destinos (ver Transformação).
                </li>
              ) : (
                <li key={destino.caminho} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <XmlDoDestino caminho={destino.caminho} exemplo={exemploDoDestino} />
                  </div>
                  <BotaoCopiar
                    rotulo="Copiar caminho"
                    ariaLabel={`Copiar caminho do destino ${destino.caminho}`}
                    valor={destino.caminho}
                  />
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </section>
  )
}

function ComoPreencher({ campo }: { campo: CampoVersaoPublico }) {
  const tituloId = useId()
  const atributos = [
    { rotulo: 'Condição', valor: campo.condicao, ehLargo: true },
    { rotulo: 'Máscara', valor: campo.mascara, ehLargo: false },
    { rotulo: 'Valores aceitos', valor: campo.dominio, ehLargo: false },
    { rotulo: 'Nota de preenchimento', valor: campo.notaPreenchimento, ehLargo: true },
  ].filter((atributo) => preenchido(atributo.valor))

  if (atributos.length === 0) return null

  return (
    <section aria-labelledby={tituloId}>
      <h3 id={tituloId} className={ROTULO_DE_SECAO}>
        Como preencher
      </h3>
      <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {atributos.map((atributo) => (
          <div key={atributo.rotulo} className={atributo.ehLargo ? 'sm:col-span-2' : undefined}>
            <dt className="text-xs font-medium text-muted">{atributo.rotulo}</dt>
            {/* As notas chegam em parágrafos: preservar as quebras de linha. */}
            <dd className="mt-0.5 text-sm whitespace-pre-line text-ink [overflow-wrap:anywhere]">
              {atributo.valor}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Transformacao({ nota }: { nota: string | null }) {
  const tituloId = useId()
  if (!preenchido(nota)) return null

  return (
    <section aria-labelledby={tituloId}>
      <h3 id={tituloId} className={ROTULO_DE_SECAO}>
        Transformação
      </h3>
      <p className="mt-2 text-sm whitespace-pre-line text-ink [overflow-wrap:anywhere]">{nota}</p>
    </section>
  )
}

/**
 * Corpo do modal do campo. O mapeamento é o centro: o caminho no InvoiCy domina (borda forte,
 * rótulo e caminho maiores, única sombra) e o XML do provedor vem logo abaixo, ligado por uma seta.
 * O resto — significado, resumo, como preencher, transformação e rejeições — se organiza ao redor.
 */
export function ConteudoDoCampo({ campo, errosResumo }: ConteudoDoCampoProps) {
  const resumoId = useId()
  const temDestino = separarDestinos(campo.destinoXml).length > 0

  return (
    <div className="flex flex-col gap-5">
      {preenchido(campo.significado) && (
        <p className="max-w-[75ch] text-base leading-relaxed whitespace-pre-line text-ink">
          {campo.significado}
        </p>
      )}

      <section aria-labelledby={resumoId}>
        <h3 id={resumoId} className="sr-only">
          Resumo
        </h3>
        <ResumoDoCampo campo={campo} />
      </section>

      <div className="flex flex-col gap-3">
        <PainelCaminhoInvoicy
          titulo="No InvoiCy"
          nomeDoCampo={campo.nome}
          caminhoXml={campo.caminhoXml}
        />
        {temDestino && <ConectorParaOProvedor />}
        <PainelNoXmlDoProvedor campo={campo} />
      </div>

      <ComoPreencher campo={campo} />
      <Transformacao nota={campo.notaTransformacao} />
      <RejeicoesDoCampo erros={campo.errosConhecidos} errosResumo={errosResumo} />
    </div>
  )
}
