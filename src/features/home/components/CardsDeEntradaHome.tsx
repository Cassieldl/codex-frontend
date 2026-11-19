import { Link } from '@tanstack/react-router'
import { Plug, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { CLASSE_CARD_CLICAVEL } from '../../../components/ui/classesDeCard'

const CLASSE_CARD_DE_ENTRADA = `${CLASSE_CARD_CLICAVEL} group flex h-full flex-col gap-3 p-7 text-primary shadow-card`

type DirecaoDaSeta = 'direita' | 'baixo'

// A seta anda 4px no hover do card, na direção para onde o link leva.
const SETA: Record<DirecaoDaSeta, { simbolo: string; movimento: string }> = {
  direita: { simbolo: '→', movimento: 'group-hover:translate-x-1' },
  baixo: { simbolo: '↓', movimento: 'group-hover:translate-y-1' },
}

interface CardDeEntradaProps {
  icone: ReactNode
  titulo: string
  texto: string
  acao: string
  seta: DirecaoDaSeta
}

function ConteudoDoCard({ icone, titulo, texto, acao, seta }: CardDeEntradaProps) {
  return (
    <>
      <span className="flex size-11 items-center justify-center rounded-xl bg-alert-info text-primary-medium">
        {icone}
      </span>
      <span className="text-subtitulo font-bold">{titulo}</span>
      <span className="text-sm leading-relaxed text-muted">{texto}</span>
      <span className="mt-auto text-sm font-bold text-primary-medium">
        {acao}{' '}
        <span
          aria-hidden="true"
          className={`inline-block transition-transform duration-150 ${SETA[seta].movimento}`}
        >
          {SETA[seta].simbolo}
        </span>
      </span>
    </>
  )
}

/** Os dois caminhos de quem chega: resolver um erro ou integrar um provedor. */
export function CardsDeEntradaHome({ idSecaoProvedores }: { idSecaoProvedores: string }) {
  return (
    <>
      <Link to="/erros" search={{ codigo: '' }} className={CLASSE_CARD_DE_ENTRADA}>
        <ConteudoDoCard
          icone={<TriangleAlert className="size-5" aria-hidden="true" />}
          titulo="Recebi um erro"
          texto="Cole o código ou a mensagem na busca. O erro abre com o campo envolvido e, quando documentada, a correção."
          acao="Ver os erros conhecidos"
          seta="direita"
        />
      </Link>

      <a href={`#${idSecaoProvedores}`} className={CLASSE_CARD_DE_ENTRADA}>
        <ConteudoDoCard
          icone={<Plug className="size-5" aria-hidden="true" />}
          titulo="Vou integrar um provedor"
          texto="Campos, tipo, tamanho, obrigatoriedade e um XML modelo, por provedor."
          acao="Escolher provedor"
          seta="baixo"
        />
      </a>
    </>
  )
}
