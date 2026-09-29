import { Link } from '@tanstack/react-router'
import { ListChecks } from 'lucide-react'
import { rotuloVerificacao } from '../../../utils/formatarDataVerificacao'
import type { VersaoProvedorResumo } from '../types/provedor'

export interface ProvedorIndexConteudoProps {
  provedorSlug: string
  versoes: VersaoProvedorResumo[]
}

/**
 * Conteúdo de `/provedores/{slug}` — nenhuma aba escolhida (§7.6.1).
 * Extraído do arquivo de rota (`src/routes/provedores/$provedorSlug/index.tsx`)
 * para ser testável sem montar o layout inteiro.
 *
 * **M25 — nunca navega sozinho**, mesmo com uma única versão: o clique é
 * sempre uma ação explícita do usuário. Por isso este componente não tem
 * nenhum `useEffect`/`navigate` — só renderiza a lista, sempre, e nenhum
 * link carrega rótulo de "recomendado" ou "vigente" (U7).
 */
export function ProvedorIndexConteudo({ provedorSlug, versoes }: ProvedorIndexConteudoProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <ListChecks className="size-10 text-primary-medium" aria-hidden="true" />
      <h2 className="text-subtitulo font-semibold text-ink">
        Escolha uma versão para ver os campos, avisos e erros conhecidos
      </h2>

      <ul className="flex w-full max-w-md flex-col gap-2 text-left">
        {versoes.map((versao) => (
          <li key={versao.slug}>
            <Link
              to="/provedores/$provedorSlug/$versaoSlug"
              params={{ provedorSlug, versaoSlug: versao.slug }}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border px-4 py-3 hover:shadow-hover"
            >
              <span className="font-medium text-ink">{versao.rotulo}</span>
              <span className="shrink-0 text-xs text-muted">
                {rotuloVerificacao(versao.verificadoEm)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
