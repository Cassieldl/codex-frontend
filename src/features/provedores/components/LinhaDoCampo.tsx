import { memo } from 'react'
import type { MouseEvent } from 'react'
import { SeloReformaTributaria } from '../../../components/ui/SeloReformaTributaria'
import { cn } from '../../../lib/cn'
import type { SecaoInicialDoModal } from '../types/modalDoCampo'
import type { CampoVersaoPublico } from '../types/versaoProvedorPagina'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import { separarDestinos } from '../utils/destinosXml'
import type { DestinoDoCampo } from '../utils/destinosXml'
import { IndicadorErrosDoCampo } from './IndicadorErrosDoCampo'
import { MarcadorObrigatoriedade } from './MarcadorObrigatoriedade'

export interface LinhaDoCampoProps {
  campo: CampoVersaoPublico
  /** Último campo aberto: recebe o destaque e o `aria-current`. */
  ativo: boolean
  /** A versão tem algum exemplo: sem nenhum, a coluna Exemplo não existe. */
  mostrarExemplo?: boolean
  /** Precisa ser estável (`useCallback`): sem isso o `memo` não evita nenhum render. */
  onAbrir: (campoLayoutSlug: string, secao?: SecaoInicialDoModal) => void
}

/** Colunas que somem em tela estreita; o resumo móvel dentro da 1ª célula as substitui. */
export const CLASSE_SO_NO_DESKTOP = 'hidden min-[860px]:table-cell'

const CLASSE_DO_NOME =
  'text-left font-mono text-[13px] font-semibold text-ink [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover'

const CLASSE_DA_TAG =
  'block font-mono text-[13px] font-semibold text-primary-medium [overflow-wrap:anywhere]'

function descreverResumoMovel(campo: CampoVersaoPublico): string {
  const partes = [campo.tipo]
  if (campo.exemplo) partes.push(`ex.: ${campo.exemplo}`)
  return partes.join(' · ')
}

function DestinosDoCampo({ destinos }: { destinos: DestinoDoCampo[] }) {
  // Célula vazia na tela; o leitor de tela ouve o motivo.
  if (destinos.length === 0) {
    return <span className="sr-only">sem destino no XML do provedor</span>
  }

  return (
    <>
      {destinos.map((destino) =>
        destino.tipo === 'omitidos' ? (
          <span key="omitidos" className="text-xs text-muted italic">
            e mais destinos
          </span>
        ) : (
          <span key={destino.caminho} className="flex items-baseline gap-1.5">
            <span aria-hidden="true" className="text-muted">
              →
            </span>
            <span className={CLASSE_DA_TAG} title={destino.caminho}>
              {destino.tag}
            </span>
          </span>
        ),
      )}
    </>
  )
}

/**
 * Linha de um campo na lista do bloco. O caminho de teclado é o botão do nome; o `onClick` da
 * linha é só conveniência de mouse e ignora cliques que nascem em botão ou link, senão o contador
 * de rejeições abriria o detalhe duas vezes, uma delas sem a seção.
 */
export const LinhaDoCampo = memo(function LinhaDoCampo({
  campo,
  ativo,
  mostrarExemplo = true,
  onAbrir,
}: LinhaDoCampoProps) {
  const slug = campo.campoLayoutSlug
  const destinos = separarDestinos(campo.destinoXml)

  function abrirPeloClique(evento: MouseEvent<HTMLTableRowElement>) {
    if (evento.target instanceof Element && evento.target.closest('button, a')) return
    onAbrir(slug)
  }

  return (
    <tr
      id={construirIdLinhaCampo(slug)}
      onClick={abrirPeloClique}
      className={cn(
        'scroll-mt-[calc(var(--topo-fixo,0px)_+_8rem)] cursor-pointer border-t border-border align-top hover:bg-surface-hover',
        ativo && 'bg-highlight-anchor',
      )}
    >
      <td
        data-coluna="uso"
        className={cn(
          CLASSE_SO_NO_DESKTOP,
          'border-l-[3px] px-3 py-2',
          ativo ? 'border-l-accent' : 'border-l-transparent',
        )}
      >
        <MarcadorObrigatoriedade estado={campo.estadoPreenchimento} />
      </td>

      <td
        data-coluna="campo"
        className={cn(
          'px-3 py-2 max-[859px]:border-l-[3px]',
          ativo ? 'max-[859px]:border-l-accent' : 'max-[859px]:border-l-transparent',
        )}
      >
        {/* O selo RT acompanha o texto do nome. Em tela estreita a coluna Uso some e a etiqueta
            volta para a linha do nome. */}
        <div className="flex flex-wrap items-baseline gap-2">
          <MarcadorObrigatoriedade
            estado={campo.estadoPreenchimento}
            className="self-center min-[860px]:hidden"
          />
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
          {campo.reformaTributaria && <SeloReformaTributaria />}
        </div>
        <p
          data-resumo-movel=""
          className="mt-1 pl-[1.125rem] text-xs text-muted [overflow-wrap:anywhere] min-[860px]:hidden"
        >
          {descreverResumoMovel(campo)}
        </p>
      </td>

      <td data-coluna="tag" className="px-3 py-2">
        <DestinosDoCampo destinos={destinos} />
      </td>

      <td data-coluna="tipo" className={cn(CLASSE_SO_NO_DESKTOP, 'px-3 py-2 text-xs text-ink')}>
        {campo.tipo}
      </td>

      {mostrarExemplo && (
        <td data-coluna="exemplo" className={cn(CLASSE_SO_NO_DESKTOP, 'px-3 py-2')}>
          {campo.exemplo && (
            <span
              className="line-clamp-2 font-mono text-xs text-ink [overflow-wrap:anywhere]"
              title={campo.exemplo}
            >
              {campo.exemplo}
            </span>
          )}
        </td>
      )}

      <td data-coluna="rejeicoes" className="px-3 py-2 text-right">
        <IndicadorErrosDoCampo
          erros={campo.errosConhecidos}
          nomeDoCampo={campo.nome}
          onVerErros={() => onAbrir(slug, 'rejeicoes')}
        />
      </td>
    </tr>
  )
})
