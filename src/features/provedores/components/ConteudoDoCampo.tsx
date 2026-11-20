import clsx from 'clsx'
import { useId } from 'react'

import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'
import type {
  CampoVersaoPublico,
  ErroResumoPublico,
  NaturezaOperacaoPublica,
} from '../types/versaoProvedorPagina'
import { conversaoDoCampo, exemploNoProvedor } from '../utils/conversaoDoCampo'
import type { ConversaoDeValor } from '../utils/conversaoDoCampo'
import { nomeDaTag, separarDestinos } from '../utils/destinosXml'
import type { DestinoDoCampo } from '../utils/destinosXml'
import { RejeicoesDoCampo } from './RejeicoesDoCampo'
import { XmlDoDestino } from './XmlDoDestino'

export interface ConteudoDoCampoProps {
  campo: CampoVersaoPublico
  errosResumo: ErroResumoPublico[]
  /** De-para da natureza da operação: no campo `natOp`, o exemplo mostra a conversão. */
  naturezasOperacao?: NaturezaOperacaoPublica[]
}

const ROTULO_DE_SECAO = 'text-aux font-semibold tracking-wide text-muted uppercase'

const ROTULO_NO_ESCURO = 'text-aux font-semibold tracking-wide text-alert-info-borda uppercase'

function preenchido(valor: string | null): valor is string {
  return valor !== null && valor !== ''
}

function tagsDosDestinos(destinos: DestinoDoCampo[]): string[] {
  return destinos.flatMap((destino) => (destino.tipo === 'caminho' ? [destino.tag] : []))
}

interface FatoDoCampo {
  rotulo: string
  valor: string | null
  ehCodigo: boolean
}

/** Tipo sempre; máscara, tag no provedor e tamanho só quando o dado existe. */
function FatosDoCampo({ campo }: { campo: CampoVersaoPublico }) {
  const tags = tagsDosDestinos(separarDestinos(campo.destinoXml))
  const fatos: FatoDoCampo[] = [
    { rotulo: 'Tipo', valor: campo.tipo, ehCodigo: false },
    { rotulo: 'Máscara', valor: campo.mascara, ehCodigo: true },
    { rotulo: 'Tag no provedor', valor: tags.length > 0 ? tags.join(', ') : null, ehCodigo: true },
    { rotulo: 'Tamanho', valor: campo.tamanho, ehCodigo: false },
  ].filter((fato) => preenchido(fato.valor))

  return (
    <dl className="grid overflow-hidden rounded-[var(--radius-control)] border border-border sm:auto-cols-fr sm:grid-flow-col">
      {fatos.map(({ rotulo, valor, ehCodigo }) => (
        <div
          key={rotulo}
          className="min-w-0 border-b border-border px-3 py-2.5 last:border-b-0 sm:border-b-0 sm:border-l sm:first:border-l-0"
        >
          <dt className="text-xs font-medium text-muted">{rotulo}</dt>
          <dd
            className={clsx(
              'mt-0.5 text-sm font-semibold [overflow-wrap:anywhere]',
              ehCodigo ? 'font-mono text-primary-medium' : 'text-ink',
            )}
          >
            {valor}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function TagComValor({ tag, valor }: { tag: string; valor: string | null }) {
  const conteudo = valor ? (
    <span className="font-semibold text-codigo-valor">{valor}</span>
  ) : (
    <span className="text-alert-info-borda">…</span>
  )

  if (!tag) return <code className="font-mono text-[13px]">{conteudo}</code>

  return (
    <code className="font-mono text-[13px] [overflow-wrap:anywhere]">
      <span className="text-alert-info-borda">{'<'}</span>
      <span className="text-white">{tag}</span>
      <span className="text-alert-info-borda">{'>'}</span>
      {conteudo}
      <span className="text-alert-info-borda">{'</'}</span>
      <span className="text-white">{tag}</span>
      <span className="text-alert-info-borda">{'>'}</span>
    </code>
  )
}

function VoceEnvia({ campo, valor }: { campo: CampoVersaoPublico; valor: string | null }) {
  const tituloId = useId()

  return (
    <section aria-labelledby={tituloId} className="py-3">
      <div className="flex items-start justify-between gap-3">
        <h4 id={tituloId} className={ROTULO_NO_ESCURO}>
          Você envia (Layout InvoiCy)
        </h4>
        <BotaoCopiar
          compacto
          rotulo="Copiar caminho"
          ariaLabel={`Copiar caminho do campo ${campo.nome} no InvoiCy`}
          valor={campo.caminhoXml}
        />
      </div>

      <p className="mt-1">
        <TagComValor tag={nomeDaTag(campo.caminhoXml)} valor={valor} />
      </p>
      <p className="mt-1 text-xs text-alert-info-borda [overflow-wrap:anywhere]">
        Caminho no InvoiCy: <code className="font-mono text-white">{campo.caminhoXml}</code>
      </p>
    </section>
  )
}

interface ProvedorRecebeProps {
  destinos: DestinoDoCampo[]
  /** Valor que chega ao provedor: o exemplo do campo, ou ele já convertido pelo InvoiCy. */
  valor: string | null
}

function ProvedorRecebe({ destinos, valor }: ProvedorRecebeProps) {
  const tituloId = useId()
  const quantidadeDeTags = tagsDosDestinos(destinos).length
  // O exemplo é do campo, não de uma tag: só entra no XML quando há um único destino. Em dois ou
  // mais, escolher a tag que o recebe seria inventar o exemplo da outra.
  const valorDoDestino = destinos.length === 1 ? valor : null

  return (
    <section aria-labelledby={tituloId} className="py-3">
      <h4 id={tituloId} className={ROTULO_NO_ESCURO}>
        Provedor recebe
      </h4>

      {destinos.length === 0 ? (
        <p className="mt-1 text-sm text-white">Este campo não é enviado ao provedor.</p>
      ) : (
        <>
          {quantidadeDeTags >= 2 && (
            <p className="mt-1 text-xs text-alert-info-borda">
              Este campo alimenta {quantidadeDeTags} tags do XML do provedor.
            </p>
          )}

          <ul className="mt-1 flex flex-col gap-2">
            {destinos.map((destino, indice) =>
              destino.tipo === 'omitidos' ? (
                <li key={`omitidos-${indice}`} className="text-sm text-white">
                  Outros destinos em Transformação.
                </li>
              ) : (
                <li key={destino.caminho} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <XmlDoDestino caminho={destino.caminho} exemplo={valorDoDestino} />
                  </div>
                  <BotaoCopiar
                    compacto
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

function descreverConversao(conversao: ConversaoDeValor): string {
  const nota = `O InvoiCy converte: ${conversao.valorEnviado} (${conversao.descricao}) chega como ${conversao.valorRecebido}.`
  if (!conversao.aConfirmar) return nota
  return `${nota} Conversão em validação com o provedor.`
}

interface ExemploDoCampoProps {
  campo: CampoVersaoPublico
  naturezasOperacao: NaturezaOperacaoPublica[]
}

/**
 * O mapeamento num bloco só: o que se envia no Layout InvoiCy e o que o provedor recebe. No campo
 * com de-para, os dois lados mostram o mesmo par de valores da conversão.
 */
function ExemploDoCampo({ campo, naturezasOperacao }: ExemploDoCampoProps) {
  const tituloId = useId()
  const conversao = conversaoDoCampo(campo, naturezasOperacao)
  const valorEnviado = conversao?.valorEnviado ?? (preenchido(campo.exemplo) ? campo.exemplo : null)
  const valorRecebido = conversao?.valorRecebido ?? exemploNoProvedor(campo, naturezasOperacao)

  return (
    <section aria-labelledby={tituloId}>
      <div className="flex items-center justify-between gap-3">
        <h3 id={tituloId} className="text-sm font-semibold text-ink">
          {valorEnviado ? 'Exemplo' : 'Caminho no XML'}
        </h3>
        {valorEnviado && (
          <BotaoCopiar
            rotulo="Copiar exemplo"
            ariaLabel={`Copiar exemplo do campo ${campo.nome}`}
            valor={valorEnviado}
          />
        )}
      </div>

      <div className="mt-2 divide-y divide-white/15 rounded-[var(--radius-card)] bg-primary px-4 text-white">
        <VoceEnvia campo={campo} valor={valorEnviado} />
        <ProvedorRecebe destinos={separarDestinos(campo.destinoXml)} valor={valorRecebido} />
      </div>

      {conversao && <p className="mt-2 text-sm text-muted">{descreverConversao(conversao)}</p>}
    </section>
  )
}

function ComoPreencher({ campo }: { campo: CampoVersaoPublico }) {
  const tituloId = useId()
  const atributos = [
    { rotulo: 'Condição', valor: campo.condicao },
    { rotulo: 'Valores aceitos', valor: campo.dominio },
    { rotulo: 'Nota de preenchimento', valor: campo.notaPreenchimento },
  ].filter((atributo) => preenchido(atributo.valor))

  if (atributos.length === 0) return null

  return (
    <section aria-labelledby={tituloId}>
      <h3 id={tituloId} className={ROTULO_DE_SECAO}>
        Como preencher
      </h3>
      <dl className="mt-2 flex flex-col gap-3">
        {atributos.map((atributo) => (
          <div key={atributo.rotulo}>
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
 * Corpo do modal do campo: a descrição, a faixa de fatos, o exemplo com os dois lados do
 * mapeamento e, abaixo, como preencher, a transformação e as rejeições.
 */
export function ConteudoDoCampo({
  campo,
  errosResumo,
  naturezasOperacao = [],
}: ConteudoDoCampoProps) {
  return (
    <div className="flex flex-col gap-5">
      {preenchido(campo.significado) && (
        <p className="max-w-[75ch] text-base leading-relaxed whitespace-pre-line text-ink">
          {campo.significado}
        </p>
      )}

      <FatosDoCampo campo={campo} />
      <ExemploDoCampo campo={campo} naturezasOperacao={naturezasOperacao} />
      <ComoPreencher campo={campo} />
      <Transformacao nota={campo.notaTransformacao} />
      <RejeicoesDoCampo erros={campo.errosConhecidos} errosResumo={errosResumo} />
    </div>
  )
}
