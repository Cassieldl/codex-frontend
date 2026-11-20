import clsx from 'clsx'
import { BotaoCopiar } from '../../../../components/ui/BotaoCopiar'
import { EtiquetaPublicacao } from '../../../../components/ui/EtiquetaPublicacao'
import type { ResultadoItem } from '../../../busca/types/resultadoBusca'
import { caminhoDoItemBuscaInterna, resolverLinkParaCopiar } from '../utils/resolverLinkParaCopiar'
import { nomeDaListaPorTipo } from '../utils/rotaEdicaoPorTipo'

export interface LinhaResultadoBuscaInternaProps {
  item: ResultadoItem
  /** Só usado pela barra de comando, para o item ativo por teclado. */
  ativo?: boolean
  /** `id` do `<li>` - alvo do `aria-activedescendant` da paleta. `undefined` na tela 11. */
  id?: string
}

/**
 * Uma linha de resultado da busca INTERNA: título + estado de publicação +
 * botão de copiar. Compartilhada pela tela 11 (dentro do agrupamento por tipo)
 * e pela barra de comando (lista plana) - a regra de qual link copiar existe
 * uma vez só, em `resolverLinkParaCopiar`.
 *
 * **PQ-09: o bug que a paleta amplificaria:** a busca interna enxerga
 * rascunho. Oferecer "Copiar link" para todo item monta a URL PÚBLICA de um
 * conteúdo que ainda não está no ar, e o parceiro recebe 404/410. Por isso o
 * estado é lido por ITEM (`item.publicado`), nunca da página ou do grupo:
 * rascunho ganha a etiqueta e copia o link interno de edição.
 *
 * **F-3: o link interno leva à LISTA, não ao registro.** O contrato não tem
 * id de registro e quatro dos seis tipos nem rota de detalhe têm (ver
 * `rotaEdicaoPorTipo.ts`). Em vez de deixar "Copiar link interno" sugerir uma
 * precisão que não existe, o rótulo diz "(lista)" e o `aria-label` nomeia a
 * listagem de destino com a ressalva por extenso - quem só ouve a interface
 * recebe a mesma informação que quem lê o rótulo.
 *
 * Continua `<a href>` cru (não `<Link>`) de propósito: o destino publicado
 * está fora da árvore autenticada. `item.url` vem da API e passa por
 * `caminhoInternoSeguro` antes de virar sink de navegação (BAIXO-02) e antes
 * de entrar no texto copiado (BAIXO-04); se não passar, fica só o título, sem
 * link e sem botão.
 */
export function LinhaResultadoBuscaInterna({
  item,
  ativo = false,
  id,
}: LinhaResultadoBuscaInternaProps) {
  const caminho = caminhoDoItemBuscaInterna(item)
  const linkParaCopiar = resolverLinkParaCopiar(item, window.location.origin)

  return (
    <li
      id={id}
      role={id ? 'option' : undefined}
      aria-selected={id ? ativo : undefined}
      className={clsx(
        'flex items-center justify-between gap-3 rounded-[var(--radius-card)] border px-4 py-3',
        ativo ? 'border-primary-medium bg-surface-hover' : 'border-border',
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        {caminho ? (
          <a href={caminho} className="truncate font-medium text-primary-medium hover:underline">
            {item.titulo}
          </a>
        ) : (
          <span className="truncate font-medium text-ink">{item.titulo}</span>
        )}
        {!item.publicado && (
          <EtiquetaPublicacao
            publicadoProprio={false}
            publicadoEfetivo={false}
            className="self-start"
          />
        )}
      </span>

      {linkParaCopiar ? (
        <BotaoCopiar
          className="shrink-0"
          valor={linkParaCopiar}
          rotulo={item.publicado ? 'Copiar link' : 'Copiar link interno (lista)'}
          ariaLabel={
            item.publicado
              ? `Copiar link de ${item.titulo}`
              : `Copiar link interno de ${item.titulo} (leva à listagem de ${nomeDaListaPorTipo(item.tipo)}, não ao registro)`
          }
        />
      ) : (
        // Nunca um botão desabilitado sem explicação (WCAG 3.3.1/3.3.2): quem
        // lê precisa saber por que não há link, não só que não há - e os dois
        // motivos são diferentes (rascunho sem tela de edição × endereço que o
        // saneamento recusou).
        <span className="shrink-0 text-xs text-muted italic">
          {item.publicado ? 'Endereço indisponível' : 'Sem link de edição direta'}
        </span>
      )}
    </li>
  )
}
