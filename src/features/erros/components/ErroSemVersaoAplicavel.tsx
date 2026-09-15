import { Link } from '@tanstack/react-router'
import { Globe } from 'lucide-react'
import type { VersaoAplicavel } from '../types/erro'

export interface ErroSemVersaoAplicavelProps {
  versoesAplicaveis: VersaoAplicavel[]
}

const TEXTO_ERRO_GERAL =
  'Este erro é geral — não depende de um provedor específico, vale para qualquer integração.'

/**
 * "Provedores e versões aplicáveis" (§7.2) — dois estados possíveis (U9).
 * Um erro de origem `InvoiCy`/`Schema` pode chegar sem nenhuma versão
 * aplicável. Nesse caso o título da seção **some** e um texto único ocupa o
 * lugar da lista — nunca lista vazia, nunca "Aplicável a: —": é informação de
 * natureza do erro, não lacuna de cadastro.
 */
export function ErroSemVersaoAplicavel({ versoesAplicaveis }: ErroSemVersaoAplicavelProps) {
  if (versoesAplicaveis.length === 0) {
    return (
      <section
        aria-label="Provedores e versões aplicáveis"
        className="flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface-hover p-4"
      >
        <Globe className="mt-0.5 size-5 shrink-0 text-primary-medium" aria-hidden="true" />
        <p className="text-sm text-ink/80">{TEXTO_ERRO_GERAL}</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="provedores-versoes-titulo" className="flex flex-col gap-2">
      <h2 id="provedores-versoes-titulo" className="text-subtitulo font-semibold text-ink">
        Provedores e versões aplicáveis
      </h2>

      <ul className="flex flex-col gap-1.5">
        {versoesAplicaveis.map((versao) => (
          <li key={`${versao.provedorSlug}-${versao.versaoSlug}`}>
            <Link
              to="/provedores/$provedorSlug/$versaoSlug"
              params={{ provedorSlug: versao.provedorSlug, versaoSlug: versao.versaoSlug }}
              className="text-sm font-medium text-primary-medium hover:underline"
            >
              {versao.provedorNome} · {versao.versaoRotulo}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
