import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClipboardList, FileWarning, Layers } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { ErrorState } from '../../../components/ui/ErrorState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Input } from '../../../components/ui/Input'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useDebounce } from '../../busca/hooks/useDebounce'
import { ResultadoBuscaInternaLista } from '../busca/components/ResultadoBuscaInternaLista'
import { useResultadoBuscaInterna } from '../busca/hooks/useResultadoBuscaInterna'
import { montarNotaBacklog } from '../busca/utils/montarNotaBacklog'

const DEBOUNCE_MS = 300

const ATALHOS = [
  {
    to: '/interno/provedores' as const,
    titulo: 'Provedores e versões',
    descricao: 'Cadastro de provedores, versões, campos e avisos.',
    Icone: Layers,
  },
  {
    to: '/interno/campos-layout' as const,
    titulo: 'Campos do layout',
    descricao: 'Vocabulário canônico e versões do Layout InvoiCy.',
    Icone: ClipboardList,
  },
  {
    to: '/interno/erros' as const,
    titulo: 'Erros conhecidos',
    descricao: 'Catálogo de rejeições, mensagens e soluções.',
    Icone: FileWarning,
  },
]

export function InicioPage() {
  const [termo, setTermo] = useState('')
  const [parceiro, setParceiro] = useState('')
  const [chamado, setChamado] = useState('')

  const termoComAtraso = useDebounce(termo, DEBOUNCE_MS)
  const { data, isLoading, isError, refetch } = useResultadoBuscaInterna({ q: termoComAtraso })

  function aoTeclarNoCampo(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Escape') setTermo('')
  }

  async function copiarNotaBacklog() {
    const nota = montarNotaBacklog({
      termo,
      parceiro,
      chamado,
      dataFormatada: format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    })
    await navigator.clipboard.writeText(nota)
  }

  const mostrarResultados = termoComAtraso.trim().length >= 2

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-titulo font-bold text-ink">Início</h1>
          <p className="text-sm text-ink/60">
            Ache o conteúdo certo e copie o link em segundos — o índice interno enxerga rascunho.
          </p>
        </div>

        <Input
          label="Buscar no Codex"
          id="busca-interna"
          autoFocus
          placeholder="Código do erro, nome do provedor, campo…"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          onKeyDown={aoTeclarNoCampo}
          role="searchbox"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Parceiro"
            hint="Usado só para montar a nota do backlog — nunca enviado ao servidor."
            value={parceiro}
            onChange={(evento) => setParceiro(evento.target.value)}
          />
          <Input
            label="Número do chamado"
            value={chamado}
            onChange={(evento) => setChamado(evento.target.value)}
          />
        </div>

        {termo.trim().length > 0 && (
          <button
            type="button"
            onClick={copiarNotaBacklog}
            className="self-start text-xs font-medium text-primary-medium hover:underline"
          >
            Copiar nota para o backlog
          </button>
        )}

        {isLoading && mostrarResultados && (
          <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Buscando…</span>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {isError && mostrarResultados && (
          // Sem este ramo a falha some: o vazio e a lista são guardados por , então erro de
          // rede deixava a seção em branco, sem dizer nada a quem está atendendo.
          <ErrorState onRetry={() => {
            void refetch()
          }} />
        )}

        {!isLoading && !isError && mostrarResultados && data && data.totalGeral === 0 && (
          <EmptyState message="O Codex ainda não documenta esta rejeição." />
        )}

        {!isLoading && mostrarResultados && data && data.totalGeral > 0 && (
          <ResultadoBuscaInternaLista grupos={data.grupos} />
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ATALHOS.map(({ to, titulo, descricao, Icone }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-5 hover:shadow-hover"
          >
            <Icone className="size-6 text-primary" aria-hidden="true" />
            <h2 className="text-card-titulo font-medium text-ink">{titulo}</h2>
            <p className="text-sm text-ink/60">{descricao}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
