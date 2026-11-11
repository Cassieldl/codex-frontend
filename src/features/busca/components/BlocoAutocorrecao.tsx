export interface BlocoAutocorrecaoProps {
  correcao: { termoOriginal: string; termoCorrigido: string } | null
}

/**
 * Autocorreção **explícita** (§7.1): quando a API corrige o termo, mostra os
 * dois — o usuário nunca vê só o termo corrigido silenciosamente substituindo
 * o que ele digitou. Quando `correcao` é `null`, não renderiza nada.
 */
export function BlocoAutocorrecao({ correcao }: BlocoAutocorrecaoProps) {
  if (!correcao) return null

  return (
    <p className="text-sm text-muted">
      Você buscou <span className="line-through">{correcao.termoOriginal}</span> · Buscamos por{' '}
      <strong className="font-semibold text-ink">{correcao.termoCorrigido}</strong>
    </p>
  )
}
