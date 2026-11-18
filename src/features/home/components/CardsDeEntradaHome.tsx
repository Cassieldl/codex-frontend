import { Link } from '@tanstack/react-router'
import { Plug, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

const CLASSE_CARD =
  'flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-white p-7 text-primary shadow-card transition-shadow duration-150 hover:border-primary-light hover:shadow-panel'

interface CardDeEntradaProps {
  icone: ReactNode
  titulo: string
  texto: string
  acao: string
}

function ConteudoDoCard({ icone, titulo, texto, acao }: CardDeEntradaProps) {
  return (
    <>
      <span className="flex size-11 items-center justify-center rounded-xl bg-alert-info text-primary-medium">
        {icone}
      </span>
      <span className="text-subtitulo font-bold">{titulo}</span>
      <span className="text-sm leading-relaxed text-muted">{texto}</span>
      <span className="mt-auto text-sm font-bold text-primary-medium">{acao}</span>
    </>
  )
}

/** Os dois caminhos de quem chega: resolver um erro ou integrar um provedor. */
export function CardsDeEntradaHome({ idSecaoProvedores }: { idSecaoProvedores: string }) {
  return (
    <>
      <Link to="/erros" search={{ codigo: '' }} className={CLASSE_CARD}>
        <ConteudoDoCard
          icone={<TriangleAlert className="size-5" aria-hidden="true" />}
          titulo="Recebi um erro"
          texto="Cole o código ou a mensagem na busca. O erro abre com o campo envolvido e, quando documentada, a correção."
          acao="Ver os erros conhecidos →"
        />
      </Link>

      <a href={`#${idSecaoProvedores}`} className={CLASSE_CARD}>
        <ConteudoDoCard
          icone={<Plug className="size-5" aria-hidden="true" />}
          titulo="Vou integrar um provedor"
          texto="Campos, tipo, tamanho, obrigatoriedade e um XML modelo, por provedor."
          acao="Escolher provedor ↓"
        />
      </a>
    </>
  )
}
