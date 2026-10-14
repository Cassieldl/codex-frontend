import clsx from 'clsx'
import { memo } from 'react'
import type { MouseEvent } from 'react'
import { CaminhoXml } from '../../../components/ui/CaminhoXml'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import { construirIdLinhaCampo } from '../../provedores/utils/destaqueAncora'
import type { CampoLayoutPublico } from '../types/layoutPublico'

export interface LinhaDoVerbeteProps {
  campo: CampoLayoutPublico
  /** Rótulo cru da versão que o selo "novo na versão …" completa. */
  versaoRotulo: string
  /** Último campo aberto: recebe o destaque e o `aria-current`. */
  ativo: boolean
  /** Precisa ser estável (`useCallback`): sem isso o `memo` não evita nenhum render. */
  onAbrir: (slug: string) => void
}

/** Colunas que somem em tela estreita; o resumo móvel dentro da 1ª célula as substitui. */
export const CLASSE_SO_NO_DESKTOP = 'hidden min-[860px]:table-cell'

const CLASSE_DO_NOME =
  'text-left font-mono text-[13px] font-semibold text-ink [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'

const CLASSE_DO_SELO_DE_NOVO =
  'ml-2 inline-flex items-center rounded-[var(--radius-pill)] border border-dashed border-primary px-2 py-px text-aux font-semibold tracking-wide text-primary uppercase'

/**
 * Linha de um campo do dicionário. O caminho de teclado é o botão do nome; o `onClick` da linha é
 * só conveniência de mouse e ignora cliques que nascem em botão ou link, para não abrir duas vezes.
 */
export const LinhaDoVerbete = memo(function LinhaDoVerbete({
  campo,
  versaoRotulo,
  ativo,
  onAbrir,
}: LinhaDoVerbeteProps) {
  const slug = campo.slug

  function abrirPeloClique(evento: MouseEvent<HTMLTableRowElement>) {
    if (evento.target instanceof Element && evento.target.closest('button, a')) return
    onAbrir(slug)
  }

  return (
    <tr
      id={construirIdLinhaCampo(slug)}
      onClick={abrirPeloClique}
      className={clsx(
        // A folga cobre o resumo fixo (48px) e o subtítulo, que pode quebrar em até 3 linhas no celular.
        'scroll-mt-40 cursor-pointer border-t border-line align-top hover:bg-surface-hover max-[859px]:scroll-mt-48',
        ativo && 'bg-highlight-anchor',
      )}
    >
      <td
        data-coluna="campo"
        className={clsx(
          'border-l-[3px] px-3 py-2',
          ativo ? 'border-l-accent' : 'border-l-transparent',
        )}
      >
        <button
          type="button"
          data-botao-do-campo=""
          aria-haspopup="dialog"
          aria-current={ativo ? 'true' : undefined}
          title={campo.caminhoXml}
          onClick={() => onAbrir(slug)}
          className={CLASSE_DO_NOME}
        >
          {campo.nome}
        </button>

        {campo.novoNestaVersao && (
          <span className={CLASSE_DO_SELO_DE_NOVO}>
            novo na {formatarVersaoLayout(versaoRotulo)}
          </span>
        )}

        {campo.descontinuadoNestaVersao && (
          // Nunca só estilo: o texto está sempre presente.
          <span className="mt-1 block text-aux font-semibold text-ink/70">
            Descontinuado nesta versão
          </span>
        )}

        <div data-resumo-movel="" className="mt-1 min-w-0 min-[860px]:hidden">
          <CaminhoXml caminho={campo.caminhoXml} />
          {campo.significado && (
            <p className="mt-1 line-clamp-2 text-xs text-muted [overflow-wrap:anywhere]">
              {campo.significado}
            </p>
          )}
        </div>
      </td>

      <td
        data-coluna="caminho"
        className={clsx(CLASSE_SO_NO_DESKTOP, 'px-3 py-2 [overflow-wrap:anywhere]')}
      >
        <CaminhoXml caminho={campo.caminhoXml} />
      </td>

      <td data-coluna="significado" className={clsx(CLASSE_SO_NO_DESKTOP, 'px-3 py-2')}>
        {campo.significado && (
          <p
            title={campo.significado}
            className="line-clamp-2 text-xs leading-relaxed text-ink [overflow-wrap:anywhere]"
          >
            {campo.significado}
          </p>
        )}
      </td>
    </tr>
  )
})
