export interface ResultadoErroGeralProps {
  provedorNome: string | null
  versaoRotulo: string | null
  versoes: string[] | null
}

const ARIA_LABEL_GERAL = 'Geral: este erro vale para qualquer provedor'

const CLASSE_DO_CHIP =
  'inline-flex max-w-full shrink-0 sm:max-w-[45%] items-center rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs [overflow-wrap:anywhere]'

/**
 * Chip de contexto do erro no resultado da busca: o provedor e a versão, que é o que separa dois
 * erros com o mesmo código. Erro sem provedor nem versão (U9) mostra o selo "Geral", nunca um
 * espaço em branco, que sugeriria dado ausente por engano em vez de "geral por natureza".
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
        title="Este erro vale para qualquer provedor"
        className={`${CLASSE_DO_CHIP} border-border font-medium text-muted`}
      >
        Geral
      </span>
    )
  }

  const versaoTexto = versaoRotulo ?? versoes?.join(', ') ?? null

  // O separador só existe entre duas partes presentes: com provedor ausente e versões de
  // provedores diferentes, um `· ` órfão abriria o chip (P-09).
  const partes = [provedorNome, versaoTexto].filter((parte): parte is string => Boolean(parte))

  return (
    <span
      className={`${CLASSE_DO_CHIP} border-primary-light bg-white font-semibold text-primary-medium`}
    >
      {partes.join(' · ')}
    </span>
  )
}
