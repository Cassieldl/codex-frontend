import { Link } from '@tanstack/react-router'

import { ROTA_DA_ABA } from '../utils/abasDoProvedor'

export interface AtalhoXmlMontadoProps {
  provedorSlug: string
}

/** Da lista de campos ao envio modelo da versão, que abre em XML. */
export function AtalhoXmlMontado({ provedorSlug }: AtalhoXmlMontadoProps) {
  return (
    <Link
      to={ROTA_DA_ABA.envio}
      params={{ provedorSlug }}
      className="text-sm font-semibold whitespace-nowrap link-texto"
    >
      Ver como XML montado <span aria-hidden="true">→</span>
    </Link>
  )
}
