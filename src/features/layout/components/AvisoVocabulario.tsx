import { Link } from '@tanstack/react-router'

/**
 * A regra que governa a tela 6, dita em texto fixo e nunca por omissão: o
 * layout é **vocabulário**, não comportamento. Tipo, tamanho, máscara e
 * obrigatoriedade mudam de provedor para provedor — é por isso que o
 * dicionário tem só três colunas (R3).
 */
export function AvisoVocabulario() {
  return (
    <aside className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-border bg-surface-hover px-4 py-3">
      <p className="text-sm font-semibold text-ink">Vocabulário, não comportamento.</p>
      <p className="text-sm text-ink/70">
        Tipo, tamanho, máscara e obrigatoriedade não são definidos aqui — mudam de provedor para
        provedor e de versão para versão. Por isso o dicionário tem só três colunas.{' '}
        <Link
          to="/provedores"
          search={{ pagina: 1 }}
          className="font-semibold text-primary-medium hover:underline"
        >
          Veja o comportamento no seu provedor
        </Link>
        .
      </p>
    </aside>
  )
}
