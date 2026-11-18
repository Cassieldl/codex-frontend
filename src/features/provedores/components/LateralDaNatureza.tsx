import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { GrupoCampoVersao } from '../types/versaoProvedorPagina'
import { ROTA_DA_ABA } from '../utils/abasDoProvedor'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import { ehCampoNaturezaOperacao } from '../utils/naturezaOperacao'

interface LateralDaNaturezaProps {
  provedorSlug: string
  totalDeCodigos: number
  camposPorGrupo: GrupoCampoVersao[]
}

/** Lateral da aba Natureza: o limite da conversão e as rejeições do `natOp` nesta versão. */
export function LateralDaNatureza({
  provedorSlug,
  totalDeCodigos,
  camposPorGrupo,
}: LateralDaNaturezaProps) {
  const campoNatOp = camposPorGrupo
    .flatMap((grupo) => grupo.campos)
    .find((campo) => ehCampoNaturezaOperacao(campo))
  const rejeicoes = campoNatOp?.errosConhecidos.length ?? 0

  return (
    <>
      <section
        aria-labelledby="natureza-fora-da-tabela"
        className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-accent bg-alert-warning p-5"
      >
        <h2
          id="natureza-fora-da-tabela"
          className="text-card-titulo font-bold text-severidade-alerta-texto"
        >
          Código fora da tabela não converte
        </h2>
        <p className="text-sm leading-relaxed text-ink">
          Só {totalDeCodigos === 1 ? 'este código tem' : `estes ${totalDeCodigos} códigos têm`}{' '}
          conversão neste provedor. E o município pode aceitar menos: confira em{' '}
          <strong>Painel de Controle, NFS-e, Natureza da Operação</strong>.
        </p>
      </section>

      {campoNatOp && rejeicoes > 0 && (
        <section
          aria-labelledby="natop-nos-erros"
          className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-card"
        >
          <h2 id="natop-nos-erros" className="text-card-titulo font-bold text-primary">
            natOp nos erros
          </h2>
          <p className="text-sm text-muted">
            {rejeicoes} {rejeicoes === 1 ? 'erro conhecido ligado' : 'erros conhecidos ligados'} a
            este campo nesta versão.
          </p>
          <Link
            to={ROTA_DA_ABA.campos}
            params={{ provedorSlug }}
            hash={construirIdLinhaCampo(campoNatOp.campoLayoutSlug)}
            className="inline-flex items-center gap-1 self-start text-sm font-semibold text-primary-medium underline-offset-4 hover:underline"
          >
            Ver os erros de natOp
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      )}
    </>
  )
}
