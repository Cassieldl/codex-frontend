import { useId } from 'react'

import { BotaoCopiar } from './BotaoCopiar'
import { CaminhoXml } from './CaminhoXml'

export interface PainelCaminhoInvoicyProps {
  titulo: string
  nomeDoCampo: string
  caminhoXml: string
}

/** Destaque do caminho do campo no InvoiCy: é a informação principal do modal do campo. */
export function PainelCaminhoInvoicy({
  titulo,
  nomeDoCampo,
  caminhoXml,
}: PainelCaminhoInvoicyProps) {
  const tituloId = useId()

  return (
    <section
      aria-labelledby={tituloId}
      className="rounded-[var(--radius-card)] border-2 border-primary bg-white p-4 shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={tituloId} className="text-sm font-bold tracking-wide text-primary uppercase">
          {titulo}
        </h3>
        <BotaoCopiar
          rotulo="Copiar caminho"
          ariaLabel={`Copiar caminho do campo ${nomeDoCampo} no InvoiCy`}
          valor={caminhoXml}
        />
      </div>

      <p className="mt-2">
        <CaminhoXml caminho={caminhoXml} tamanho="destaque" />
      </p>
    </section>
  )
}
