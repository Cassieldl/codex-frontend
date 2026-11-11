import { Link } from '@tanstack/react-router'
import { Globe } from 'lucide-react'
import { ID_SECAO_PROVEDORES_APLICAVEIS } from '../../../components/layout/RodapeContextual'
import type { VersaoAplicavel } from '../types/erro'

export interface ErroSemVersaoAplicavelProps {
  versoesAplicaveis: VersaoAplicavel[]
}

const TEXTO_ERRO_GERAL =
  'Este erro é geral — não depende de um provedor específico, vale para qualquer integração.'

/** Um item por provedor: a página pública do provedor já mostra a versão dele. */
function provedoresDistintos(versoes: VersaoAplicavel[]): VersaoAplicavel[] {
  const vistos = new Set<string>()

  return versoes.filter((versao) => {
    if (vistos.has(versao.provedorSlug)) return false
    vistos.add(versao.provedorSlug)
    return true
  })
}

/**
 * "Provedores aplicáveis" (§7.2): dois estados possíveis (U9).
 * Um erro de origem `InvoiCy`/`Schema` pode chegar sem nenhuma versão
 * aplicável. Nesse caso o título da seção **some** e um texto único ocupa o
 * lugar da lista — nunca lista vazia, nunca "Aplicável a: —": é informação de
 * natureza do erro, não lacuna de cadastro.
 */
export function ErroSemVersaoAplicavel({ versoesAplicaveis }: ErroSemVersaoAplicavelProps) {
  if (versoesAplicaveis.length === 0) {
    return (
      <section
        aria-label="Provedores aplicáveis"
        className="flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-white p-4"
      >
        <Globe className="mt-0.5 size-5 shrink-0 text-primary-medium" aria-hidden="true" />
        <p className="text-sm text-ink">{TEXTO_ERRO_GERAL}</p>
      </section>
    )
  }

  return (
    <section aria-labelledby={ID_SECAO_PROVEDORES_APLICAVEIS} className="flex flex-col gap-2">
      <h2 id={ID_SECAO_PROVEDORES_APLICAVEIS} className="text-subtitulo font-semibold text-ink">
        Provedores aplicáveis
      </h2>

      <ul className="flex flex-col gap-1.5">
        {provedoresDistintos(versoesAplicaveis).map((versao) => (
          <li key={versao.provedorSlug}>
            <Link
              to="/provedores/$provedorSlug"
              params={{ provedorSlug: versao.provedorSlug }}
              className="text-sm font-medium text-primary-medium hover:underline"
            >
              {versao.provedorNome}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
