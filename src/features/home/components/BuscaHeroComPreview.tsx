import { Link, type LinkProps } from '@tanstack/react-router'
import { useState } from 'react'
import { caminhoInternoSeguro } from '../../../utils/caminhoInternoSeguro'
import { CampoBusca } from '../../busca/components/CampoBusca'
import { useDebounce } from '../../busca/hooks/useDebounce'
import { useResultadoBusca } from '../../busca/hooks/useResultadoBusca'
import type { GrupoResultado } from '../../busca/types/resultadoBusca'

export interface BuscaHeroComPreviewProps {
  /** Enter ou o botão Buscar, sem item escolhido: leva à tela de busca com o termo digitado. */
  aoSubmeter: (termo: string) => void
}

const DEBOUNCE_MS = 250
const TERMO_MINIMO = 2
const MAX_ITENS_POR_GRUPO = 3

function GrupoPreview({ grupo }: { grupo: GrupoResultado }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center justify-between gap-3 bg-surface-disabled px-4 py-2">
        <span className="text-aux font-semibold uppercase tracking-wider text-muted">
          {grupo.rotulo}
        </span>
        <span className="text-xs text-muted">{grupo.total}</span>
      </div>

      <ul>
        {grupo.itens.slice(0, MAX_ITENS_POR_GRUPO).map((item, indice) => {
          const caminho = caminhoInternoSeguro(item.url)
          const contexto = [item.provedorNome, item.versaoRotulo].filter(Boolean).join(' · ')

          const conteudo = (
            <>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{item.titulo}</span>
              {contexto && <span className="shrink-0 text-xs text-muted">{contexto}</span>}
            </>
          )

          return (
            // A `url` se repete entre avisos do mesmo provedor e o item não traz id: a posição desempata.
            <li
              key={`${item.tipo}-${indice}-${item.url}`}
              className="border-t border-border first:border-t-0"
            >
              {caminho ? (
                <Link
                  to={caminho as unknown as LinkProps['to']}
                  className="flex items-baseline gap-3 px-4 py-2.5 text-sm hover:bg-surface-hover"
                >
                  {conteudo}
                </Link>
              ) : (
                <span className="flex items-baseline gap-3 px-4 py-2.5 text-sm">{conteudo}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Busca em destaque da Home, com painel de pré-visualização enquanto o
 * visitante digita. Nenhum endpoint novo: é o mesmo `GET /busca` (P1) da tela
 * 2, com debounce.
 *
 * Duas regras não negociáveis herdadas da 002:
 *
 * 1. **Sem `autoFocus`.** Foco roubado no carregamento da porta de entrada do
 *    site atrapalha mais do que ajuda, e numa busca ao vivo o salto de foco
 *    chega a engolir caracteres já digitados.
 * 2. **Erro nunca é lido como vazio.** Com `isError`, o painel some e a região
 *    viva anuncia uma frase própria, **sem contagem** — "0 resultados" numa
 *    falha de rede seria uma afirmação sobre o acervo que ninguém mediu.
 */
export function BuscaHeroComPreview({ aoSubmeter }: BuscaHeroComPreviewProps) {
  const [termo, setTermo] = useState('')
  const [dispensado, setDispensado] = useState(false)
  const termoComAtraso = useDebounce(termo, DEBOUNCE_MS)

  const { data: resultado, isError } = useResultadoBusca({ q: termoComAtraso })

  const termoValido = termo.trim().length >= TERMO_MINIMO
  const painelVisivel = termoValido && !dispensado

  function digitar(valor: string) {
    setTermo(valor)
    setDispensado(false)
  }

  function submeter() {
    if (!termoValido) return
    aoSubmeter(termo.trim())
  }

  const semResultado = resultado?.qualidade === 'vazia'

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- recebe o Escape que sobe do campo de busca
    <div
      className="relative max-w-3xl"
      onKeyDown={(evento) => evento.key === 'Escape' && setDispensado(true)}
    >
      <CampoBusca
        valor={termo}
        onValorChange={digitar}
        onSubmit={submeter}
        variante="destaque"
        rotuloDoBotao="Buscar"
        placeholder="Código de erro, trecho da mensagem, provedor ou campo"
      />

      {painelVisivel && (
        <div className="absolute inset-x-0 top-18 z-20 max-h-[420px] overflow-y-auto rounded-[var(--radius-card)] border border-border bg-white shadow-panel">
          {/*
            Na falha, quem é anunciado é o próprio texto visível — sem uma
            segunda linha viva repetindo a frase, e sem contagem alguma. Um
            `aria-live` com "0 resultados" aqui afirmaria sobre o acervo algo
            que ninguém chegou a medir.
          */}
          {!isError && (
            <p role="status" aria-live="polite" className="sr-only">
              {resultado
                ? `${resultado.totalGeral} resultado(s) para ${resultado.termoUsado}.`
                : 'Buscando…'}
            </p>
          )}

          {isError ? (
            <p role="status" className="px-4 py-5 text-sm font-semibold text-ink">
              Não foi possível buscar agora.
            </p>
          ) : semResultado ? (
            <div className="px-4 py-5 text-sm text-muted">
              <p className="mb-1.5 font-semibold text-ink">
                Não há conteúdo publicado para “{resultado.termoUsado}”.
              </p>
              <p>
                O termo pode ser novo para o Codex. Fale com o suporte levando esse texto — cuidamos
                do resto.
              </p>
            </div>
          ) : (
            resultado?.grupos.map((grupo) => <GrupoPreview key={grupo.tipo} grupo={grupo} />)
          )}
        </div>
      )}
    </div>
  )
}
