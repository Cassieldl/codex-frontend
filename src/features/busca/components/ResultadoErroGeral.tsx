export interface ResultadoErroGeralProps {
  provedorNome: string | null
  versaoRotulo: string | null
  versoes: string[] | null
}

const ARIA_LABEL_GERAL = 'Geral — este erro não é específico de um provedor'

/**
 * Resultado de erro sem provedor/versão aplicável (U9) — erro `InvoiCy`/`Schema`
 * geral. Mostra o selo "Geral" com `aria-label` explicativo. **Nunca** um
 * travessão nem espaço em branco, que sugeririam dado ausente por engano em
 * vez de "geral por natureza".
 */
export function ResultadoErroGeral({
  provedorNome,
  versaoRotulo,
  versoes,
}: ResultadoErroGeralProps) {
  const semProvedorOuVersao = provedorNome === null && versaoRotulo === null && versoes === null

  if (semProvedorOuVersao) {
    return (
      <span
        aria-label={ARIA_LABEL_GERAL}
        title="Este erro não é específico de um provedor"
        className="inline-flex items-center rounded-[var(--radius-pill)] border border-border px-2 py-0.5 text-xs font-medium text-muted"
      >
        Geral
      </span>
    )
  }

  const versaoTexto = versaoRotulo ?? versoes?.join(', ') ?? null

  // O separador só existe entre duas partes presentes: com provedor ausente e
  // versões de provedores diferentes, um `· ` órfão abriria a linha (P-09).
  const partes = [provedorNome, versaoTexto].filter((parte): parte is string => Boolean(parte))

  return <span className="text-xs text-muted">{partes.join(' · ')}</span>
}
