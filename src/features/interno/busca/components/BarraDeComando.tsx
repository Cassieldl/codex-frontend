import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Input } from '../../../../components/ui/Input'
import { Modal } from '../../../../components/ui/Modal'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { Toast } from '../../../../components/ui/Toast'
import { useDebounce } from '../../../busca/hooks/useDebounce'
import type { ResultadoItem } from '../../../busca/types/resultadoBusca'
import { useResultadoBuscaInterna } from '../hooks/useResultadoBuscaInterna'
import { caminhoDoItemBuscaInterna, resolverLinkParaCopiar } from '../utils/resolverLinkParaCopiar'
import { deveIgnorarAtalhoBusca } from '../utils/deveIgnorarAtalhoBusca'
import { LinhaResultadoBuscaInterna } from './LinhaResultadoBuscaInterna'

const DEBOUNCE_MS = 300
const TERMO_MINIMO = 2
/** Mesma duração do estado "Copiado" de `BotaoCopiar` — valor replicado, não vale extrair por isto. */
const DURACAO_TOAST_MS = 2000

export interface BarraDeComandoProps {
  /**
   * Como a paleta leva o usuário ao item. O destino publicado é uma rota
   * PÚBLICA, fora da árvore autenticada — é navegação de verdade, não um push
   * de router. Injetável para o teste observar o destino sem navegar de fato.
   */
  aoNavegar?: (caminho: string) => void
}

function navegarDeFato(caminho: string) {
  window.location.href = caminho
}

/**
 * Barra de comando da área interna (§5.D): `Ctrl+K`/`Cmd+K` abre, `Esc` fecha,
 * `↑`/`↓` andam pelos resultados, `Enter` abre o item e `Ctrl+Enter` copia o
 * link **sem fechar** — a "cópia em um passo" do escopo.
 *
 * Reúso quase total: o endpoint (I21), o hook, o debounce e a linha de
 * resultado são os mesmos da tela 11. O que é novo aqui é o diálogo e o
 * teclado.
 *
 * O diálogo é o `Modal` compartilhado por composição, para não duplicar foco
 * preso, `Escape` e devolução de foco — que ele já testa. O título fica só
 * para leitor de tela (`titleVisuallyHidden`), porque o lugar do cabeçalho é
 * do campo de busca.
 */
export function BarraDeComando({ aoNavegar = navegarDeFato }: BarraDeComandoProps) {
  const idBase = useId()
  const idDoCampo = `${idBase}-campo`
  const idDoListbox = `${idBase}-listbox`

  const [aberta, setAberta] = useState(false)
  const [termo, setTermo] = useState('')
  const [indiceAtivo, setIndiceAtivo] = useState(0)
  const [avisoDeCopia, setAvisoDeCopia] = useState<string | null>(null)
  const timeoutDoAviso = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const termoComAtraso = useDebounce(termo, DEBOUNCE_MS)
  const { data, isLoading, isError, refetch } = useResultadoBuscaInterna({ q: termoComAtraso })

  // Uma lista PLANA, na ordem dos grupos: a navegação por teclado atravessa os
  // tipos sem que o usuário precise saber que existe agrupamento.
  const itens: ResultadoItem[] = (data?.grupos ?? []).flatMap((grupo) => grupo.itens)
  const buscando = termoComAtraso.trim().length >= TERMO_MINIMO
  const itemAtivo = itens[indiceAtivo] ?? null

  useEffect(() => {
    function aoTeclarNoDocumento(evento: globalThis.KeyboardEvent) {
      const ehAtalho = (evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'k'
      if (!ehAtalho) return
      if (deveIgnorarAtalhoBusca(document.activeElement)) return

      evento.preventDefault()
      setAberta(true)
    }

    // Em `document`, não em `window`: o layout monta e desmonta nos testes, e
    // um ouvinte global sobreviveria ao desmonte da árvore que o registrou.
    document.addEventListener('keydown', aoTeclarNoDocumento)
    return () => document.removeEventListener('keydown', aoTeclarNoDocumento)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutDoAviso.current) clearTimeout(timeoutDoAviso.current)
    }
  }, [])

  // Resultado novo recoloca o foco de teclado no topo: manter o índice
  // apontaria para um item que já não é o mesmo.
  useEffect(() => {
    setIndiceAtivo(0)
  }, [termoComAtraso, data])

  function idDaOpcao(indice: number) {
    return `${idDoListbox}-opcao-${indice}`
  }

  function fechar() {
    setAberta(false)
    setAvisoDeCopia(null)
  }

  function mover(direcao: 1 | -1) {
    if (itens.length === 0) return
    setIndiceAtivo((anterior) => (anterior + direcao + itens.length) % itens.length)
  }

  async function copiarLinkDoItemAtivo(item: ResultadoItem) {
    const link = resolverLinkParaCopiar(item, window.location.origin)
    if (!link) {
      setAvisoDeCopia('Este item não tem link para copiar.')
      return
    }

    await navigator.clipboard.writeText(link)
    setAvisoDeCopia(item.publicado ? 'Link copiado.' : 'Link interno copiado.')

    if (timeoutDoAviso.current) clearTimeout(timeoutDoAviso.current)
    timeoutDoAviso.current = setTimeout(() => setAvisoDeCopia(null), DURACAO_TOAST_MS)
  }

  function aoTeclarNoCampo(evento: KeyboardEvent<HTMLInputElement>) {
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault()
        mover(1)
        break
      case 'ArrowUp':
        evento.preventDefault()
        mover(-1)
        break
      case 'Enter': {
        evento.preventDefault()
        if (!itemAtivo) return

        // `Ctrl/Cmd+Enter` copia e a paleta CONTINUA aberta — quem copia link
        // no atendimento costuma copiar vários seguidos.
        if (evento.ctrlKey || evento.metaKey) {
          void copiarLinkDoItemAtivo(itemAtivo)
          return
        }

        const caminho = caminhoDoItemBuscaInterna(itemAtivo)
        if (!caminho) return
        fechar()
        aoNavegar(caminho)
        break
      }
    }
  }

  // Sem a guarda de erro, quem usa leitor de tela ouve "0 resultados" quando a requisição falhou
  // — a versão em áudio da mesma mentira que o texto da tela dava antes.
  const contagem =
    buscando && !isError ? `${itens.length} resultado${itens.length === 1 ? '' : 's'}` : ''

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Abrir busca rápida (Ctrl+K)"
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium text-ink hover:shadow-hover"
      >
        <Search className="size-4" aria-hidden="true" />
        Busca rápida
        <kbd className="rounded border border-border px-1 text-xs text-muted">Ctrl K</kbd>
      </button>

      <Modal isOpen={aberta} onClose={fechar} title="Busca rápida" titleVisuallyHidden size="lg">
        <div className="flex flex-col gap-3">
          <Input
            id={idDoCampo}
            label="Buscar no Codex"
            placeholder="Código do erro, nome do provedor, campo, artigo…"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            onKeyDown={aoTeclarNoCampo}
            role="combobox"
            aria-expanded={itens.length > 0}
            aria-controls={itens.length > 0 ? idDoListbox : undefined}
            aria-activedescendant={itemAtivo ? idDaOpcao(indiceAtivo) : undefined}
            aria-autocomplete="list"
          />

          {/* Contador em elemento próprio, nunca no listbox: anunciar pelo
              próprio listbox faria o leitor de tela repetir a lista inteira. */}
          <span aria-live="polite" className="sr-only">
            {contagem}
          </span>

          <p className="text-xs text-muted">
            ↑ ↓ para percorrer · Enter para abrir · Ctrl+Enter para copiar o link · Esc para fechar
          </p>

          {isLoading && buscando && (
            <div aria-busy="true" className="flex flex-col gap-2">
              <span className="sr-only">Buscando…</span>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {!buscando && (
            <p className="text-xs text-muted italic">
              Digite ao menos {TERMO_MINIMO} caracteres para buscar.
            </p>
          )}

          {isError && buscando && (
            // Sem esta guarda o ramo de vazio absorveria a falha e a paleta AFIRMARIA que o acervo
            // não tem o item — para quem está ao telefone com o parceiro. Erro de rede não é
            // resposta vazia.
            <div className="space-y-2 text-sm">
              <p className="text-ink">Não foi possível buscar agora.</p>
              <button
                type="button"
                onClick={() => {
                  void refetch()
                }}
                className="rounded-[5px] border border-line px-3 py-1 text-sm text-ink transition-shadow duration-150 hover:shadow-hover"
              >
                Tentar de novo
              </button>
            </div>
          )}

          {!isLoading && !isError && buscando && itens.length === 0 && (
            <p className="text-sm text-muted">O Codex ainda não documenta esta rejeição.</p>
          )}

          {itens.length > 0 && (
            <ul
              id={idDoListbox}
              role="listbox"
              aria-label="Resultados"
              className="flex flex-col gap-2"
            >
              {itens.map((item, indice) => (
                <LinhaResultadoBuscaInterna
                  key={`${item.tipo}-${indice}-${item.url}`}
                  item={item}
                  id={idDaOpcao(indice)}
                  ativo={indice === indiceAtivo}
                />
              ))}
            </ul>
          )}

          {avisoDeCopia && (
            <Toast tone="success" message={avisoDeCopia} onClose={() => setAvisoDeCopia(null)} />
          )}
        </div>
      </Modal>
    </>
  )
}
