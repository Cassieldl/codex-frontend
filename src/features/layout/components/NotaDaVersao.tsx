import { lerNotaDaVersaoLayout } from '../../../utils/notaDaVersaoLayout'

export interface NotaDaVersaoProps {
  descricao: string | null
  /** Só o resumo: os tópicos ficam de fora quando a tela já lista as mudanças uma a uma. */
  somenteResumo?: boolean
}

/** Nota de uma versão do Layout InvoiCy: o resumo e, quando a nota traz, um tópico por linha. */
export function NotaDaVersao({ descricao, somenteResumo = false }: NotaDaVersaoProps) {
  const nota = lerNotaDaVersaoLayout(descricao)
  const resumo = nota.resumo
  const topicos = somenteResumo ? [] : nota.topicos
  if (!resumo && topicos.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {resumo && <p className="max-w-prose text-sm text-ink">{resumo}</p>}

      {topicos.length > 0 && (
        <dl className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-[max-content_1fr]">
          {topicos.map((topico) => (
            <div key={topico.rotulo} className="contents">
              <dt className="font-semibold text-ink">{topico.rotulo}</dt>
              <dd className="mb-1.5 text-ink [overflow-wrap:anywhere] sm:mb-0">{topico.texto}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
