import { Link } from '@tanstack/react-router'
import { Info } from 'lucide-react'

/**
 * O layout é vocabulário, não comportamento: tipo, tamanho, máscara e obrigatoriedade mudam de
 * provedor para provedor, por isso o dicionário tem só nome, caminho e significado (R3).
 */
export function AvisoVocabulario() {
  return (
    <p className="flex items-start gap-2 text-sm text-muted">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-medium" />
      <span>
        Tipo e obrigatoriedade de cada campo dependem do provedor.{' '}
        <Link
          to="/provedores"
          search={{ pagina: 1 }}
          className="font-semibold text-primary-medium hover:underline"
        >
          Ver no seu provedor
        </Link>
      </span>
    </p>
  )
}
