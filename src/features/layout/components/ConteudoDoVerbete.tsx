import { PainelCaminhoInvoicy } from '../../../components/ui/PainelCaminhoInvoicy'
import type { CampoLayoutPublico } from '../types/layoutPublico'
import type { AtalhoDaEstrutura } from '../types/modalDoVerbete'
import { LinksVerNaEstrutura } from './LinksVerNaEstrutura'
import { UsosDoCampo } from './UsosDoCampo'

export interface ConteudoDoVerbeteProps {
  campo: CampoLayoutPublico
  slugAssentado: string
  estrutura?: AtalhoDaEstrutura
}

/**
 * Corpo do modal do campo do layout: o significado, o caminho no InvoiCy e, por último, como cada
 * provedor o usa. Tipo, tamanho, máscara e obrigatoriedade são do provedor, nunca do vocabulário:
 * só aparecem dentro dos usos.
 */
export function ConteudoDoVerbete({ campo, slugAssentado, estrutura }: ConteudoDoVerbeteProps) {
  return (
    <div className="flex flex-col gap-5">
      {campo.significado !== '' && (
        <p className="max-w-[75ch] text-base leading-relaxed whitespace-pre-line text-ink">
          {campo.significado}
        </p>
      )}

      <PainelCaminhoInvoicy
        titulo="No Layout InvoiCy"
        nomeDoCampo={campo.nome}
        caminhoXml={campo.caminhoXml}
      />

      {estrutura && (
        <LinksVerNaEstrutura
          versaoSlug={estrutura.versaoSlug}
          campoSlug={campo.slug}
          nomeDoCampo={campo.nome}
          formatos={estrutura.formatos}
          variante="completa"
          className="text-sm"
        />
      )}

      <UsosDoCampo campoSlug={campo.slug} slugAssentado={slugAssentado} nomeDoCampo={campo.nome} />
    </div>
  )
}
