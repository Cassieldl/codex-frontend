import { Link } from '@tanstack/react-router'
import type { GrupoCampoVersao } from '../types/versaoProvedorPagina'
import { ROTA_DA_ABA } from '../utils/abasDoProvedor'
import { camposComMaisRejeicoes } from '../utils/camposComMaisRejeicoes'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'

interface LateralDaAbaErrosProps {
  provedorSlug: string
  provedorNome: string
  versaoRotulo: string
  camposPorGrupo: GrupoCampoVersao[]
}

function CamposMaisRejeitados({
  provedorSlug,
  camposPorGrupo,
}: Pick<LateralDaAbaErrosProps, 'provedorSlug' | 'camposPorGrupo'>) {
  const campos = camposComMaisRejeicoes(camposPorGrupo)
  if (campos.length === 0) return null

  const maior = campos[0].rejeicoes

  return (
    <section
      aria-labelledby="campos-mais-rejeitados"
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-card"
    >
      <div>
        <h2 id="campos-mais-rejeitados" className="text-card-titulo font-bold text-primary">
          Campos com mais rejeições
        </h2>
        <p className="text-xs text-muted">Erros conhecidos ligados a cada campo nesta versão.</p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {campos.map((campo) => (
          <li key={campo.slug}>
            <Link
              to={ROTA_DA_ABA.campos}
              params={{ provedorSlug }}
              hash={construirIdLinhaCampo(campo.slug)}
              aria-label={`${campo.nome}: ${campo.rejeicoes} ${campo.rejeicoes === 1 ? 'erro' : 'erros'}`}
              className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 rounded text-sm hover:underline"
            >
              <span className="truncate font-mono font-semibold text-primary-medium">
                {campo.nome}
              </span>
              <span
                aria-hidden="true"
                className="h-1.5 overflow-hidden rounded-[var(--radius-pill)] bg-line"
              >
                <span
                  className="block h-full rounded-[var(--radius-pill)] bg-primary-light"
                  style={{ width: `${(campo.rejeicoes / maior) * 100}%` }}
                />
              </span>
              <span className="font-bold text-ink tabular-nums">{campo.rejeicoes}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Lateral da aba Erros: o que mais rejeita e o atalho para o XML de exemplo. */
export function LateralDaAbaErros({
  provedorSlug,
  provedorNome,
  versaoRotulo,
  camposPorGrupo,
}: LateralDaAbaErrosProps) {
  return (
    <>
      <CamposMaisRejeitados provedorSlug={provedorSlug} camposPorGrupo={camposPorGrupo} />

      <section
        aria-labelledby="atalho-envio-modelo"
        className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-primary p-5 text-white"
      >
        <h2 id="atalho-envio-modelo" className="text-card-titulo font-bold">
          Envio modelo
        </h2>
        <p className="text-sm text-white">
          XML de exemplo do {provedorNome} {versaoRotulo}, mínimo ou máximo.
        </p>
        <Link
          to={ROTA_DA_ABA.envio}
          params={{ provedorSlug }}
          className="inline-flex h-10 items-center self-start rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-primary transition-shadow duration-150 hover:shadow-panel"
        >
          Abrir envio modelo
        </Link>
      </section>
    </>
  )
}
