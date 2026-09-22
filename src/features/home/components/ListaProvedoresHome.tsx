import { Link } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import type { CategoriaProvedorHome, CategoriaProvedoresHome, ProvedorHomeDto } from '../types/home'
import { formatarDataCurta } from '../utils/formatarDatas'

export interface ListaProvedoresHomeProps {
  categorias: CategoriaProvedoresHome[]
}

const ROTULO_CATEGORIA: Record<CategoriaProvedorHome, string> = {
  Nacional: 'Nacional',
  Proprio: 'Próprio',
}

function LinhaProvedorHome({ provedor }: { provedor: ProvedorHomeDto }) {
  const [ultimaVersao] = provedor.versoes
  const outras = Math.max(0, provedor.versoes.length - 1)

  return (
    <li className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-line px-4 py-3 first:border-t-0 hover:shadow-hover">
      <Link
        to="/provedores/$provedorSlug"
        params={{ provedorSlug: provedor.slug }}
        className="min-w-0 flex-1 truncate font-medium text-ink hover:underline"
      >
        {provedor.nome}
      </Link>

      {/* Ícone + rótulo acessível — o alerta nunca é comunicado só por cor. */}
      {provedor.temComunicado && (
        <TriangleAlert
          role="img"
          aria-label={`Comunicado ativo para ${provedor.nome}`}
          className="size-4 shrink-0 text-severidade-alerta-texto"
        />
      )}

      <span className="w-[70px] shrink-0">
        {ultimaVersao ? (
          <Link
            to="/provedores/$provedorSlug/$versaoSlug"
            params={{ provedorSlug: provedor.slug, versaoSlug: ultimaVersao.slug }}
            className="inline-flex rounded-[var(--radius-pill)] border border-border px-2.5 py-0.5 text-xs font-semibold text-primary hover:shadow-hover"
          >
            {ultimaVersao.rotulo}
          </Link>
        ) : (
          <span className="text-xs text-ink/50">Nenhuma publicada</span>
        )}
      </span>

      <span className="w-[86px] shrink-0 text-xs">
        {outras > 0 && (
          <Link
            to="/provedores/$provedorSlug"
            params={{ provedorSlug: provedor.slug }}
            className="font-medium text-primary-medium hover:underline"
          >
            +{outras} {outras > 1 ? 'outras' : 'outra'}
          </Link>
        )}
      </span>

      <span className="shrink-0 text-xs text-muted sm:w-[168px] sm:text-right">
        {provedor.verificadoEm
          ? `Verificado em ${formatarDataCurta(provedor.verificadoEm)}`
          : 'Ainda não verificado'}
      </span>
    </li>
  )
}

/**
 * Lista de provedores da Home, agrupada por categoria.
 *
 * Componente próprio (e não o `ListaProvedores` de P2) porque o dado é outro:
 * `ProvedorHomeDto` traz `temComunicado` e a versão mais recente em destaque,
 * enquanto `ProvedorListaItem` traz todas as versões como chips iguais.
 *
 * A coluna se chama **"Última versão"**, não "Vigente" como no artboard:
 * `VersaoProvedor` não tem estado de vigência — só o Layout InvoiCy tem
 * (arquitetura §5.D.3/U-4). Chamar de "vigente" aqui inventaria um conceito
 * que o domínio recusou de propósito.
 */
export function ListaProvedoresHome({ categorias }: ListaProvedoresHomeProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="hidden items-center gap-3.5 px-4 text-aux font-semibold uppercase tracking-wider text-muted sm:flex">
        <span className="min-w-0 flex-1" />
        <span className="w-[70px] shrink-0">Última versão</span>
        <span className="w-[86px] shrink-0">Outras</span>
        <span className="w-[168px] shrink-0 text-right">Verificado em</span>
      </div>

      {categorias.map((categoria) => (
        <section
          key={categoria.categoria}
          aria-labelledby={`categoria-home-${categoria.categoria}`}
        >
          <div className="mb-2 flex items-center gap-2.5">
            <h3
              id={`categoria-home-${categoria.categoria}`}
              className="text-aux font-semibold uppercase tracking-wider text-muted"
            >
              {ROTULO_CATEGORIA[categoria.categoria]}
            </h3>
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">{categoria.total}</span>
          </div>

          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
            {categoria.provedores.map((provedor) => (
              <LinhaProvedorHome key={provedor.slug} provedor={provedor} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
