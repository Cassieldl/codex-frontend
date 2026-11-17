export interface OrigemDaVersaoProps {
  normaOrigem: string | null | undefined
}

/** "Origem: NT 009 v1.01", a norma de onde a versão veio; sem norma, não aparece. */
export function OrigemDaVersao({ normaOrigem }: OrigemDaVersaoProps) {
  const norma = normaOrigem?.trim()
  if (!norma) return null

  return (
    <p data-origem-da-versao="" className="text-sm text-muted">
      Origem: <strong className="font-semibold text-ink">{norma}</strong>
    </p>
  )
}
