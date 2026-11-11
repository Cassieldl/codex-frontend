import { Link } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import { rotuloVerificacao } from '../../../utils/formatarDataVerificacao'
import type { CategoriaProvedorHome, CategoriaProvedoresHome, ProvedorHomeDto } from '../types/home'

export interface ListaProvedoresHomeProps {
  categorias: CategoriaProvedoresHome[]
}

const ROTULO_CATEGORIA: Record<CategoriaProvedorHome, string> = {
  Nacional: 'Nacional',
  Proprio: 'Próprio',
}

function LinhaProvedorHome({ provedor }: { provedor: ProvedorHomeDto }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-line px-4 py-3 first:border-t-0 hover:shadow-hover">
      {/* No celular o nome ocupa a linha inteira e os demais itens descem: truncar ali cortava
          "Emissor Nacional" em "Emiss...". A partir de `sm` volta a ser coluna flexível. */}
      <Link
        to="/provedores/$provedorSlug"
        params={{ provedorSlug: provedor.slug }}
        className="min-w-0 basis-full font-semibold text-primary [overflow-wrap:anywhere] hover:underline sm:flex-1 sm:basis-0 sm:truncate"
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

      <span className="shrink-0 text-xs font-medium text-ink sm:w-[168px] sm:text-right">
        {rotuloVerificacao(provedor.verificadoEm)}
      </span>
    </li>
  )
}

/**
 * Lista de provedores da Home, agrupada por categoria.
 *
 * Componente próprio (e não o `ListaProvedores` de P2) porque o dado é outro:
 * `ProvedorHomeDto` traz `temComunicado`. Sem coluna de versão: cada provedor tem uma
 * versão publicada, e a página dele já abre direto no conteúdo.
 */
export function ListaProvedoresHome({ categorias }: ListaProvedoresHomeProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="hidden items-center gap-3.5 px-4 text-aux font-bold uppercase tracking-wider text-primary-medium sm:flex">
        <span className="min-w-0 flex-1" />
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
              className="text-aux font-bold uppercase tracking-wider text-primary-medium"
            >
              {ROTULO_CATEGORIA[categoria.categoria]}
            </h3>
            <span className="h-px flex-1 bg-line" />
            {/* O número sozinho, encostado na borda, lia-se como artefato — e um leitor de tela
                anunciava só "2". A unidade é barata e resolve os dois. */}
            <span className="text-xs text-muted">
              {categoria.total} {categoria.total === 1 ? 'provedor' : 'provedores'}
            </span>
          </div>

          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-card">
            {categoria.provedores.map((provedor) => (
              <LinhaProvedorHome key={provedor.slug} provedor={provedor} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
