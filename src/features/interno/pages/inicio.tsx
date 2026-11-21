import { Link } from '@tanstack/react-router'
import { ClipboardList, FileWarning, Layers } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { ErrorState } from '../../../components/ui/ErrorState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Input } from '../../../components/ui/Input'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useDebounce } from '../../busca/hooks/useDebounce'
import { usePermissoesInterno } from '../hooks/usePermissoesInterno'
import { ResultadoBuscaInternaLista } from '../busca/components/ResultadoBuscaInternaLista'
import { useResultadoBuscaInterna } from '../busca/hooks/useResultadoBuscaInterna'
import { FilaLacunasBusca } from '../lacunasBusca/components/FilaLacunasBusca'
import { RegistrarLacunaBusca } from '../lacunasBusca/components/RegistrarLacunaBusca'
import { LIMITES_LACUNA_BUSCA } from '../lacunasBusca/types/lacunaBusca'
import { VerificacoesVencidas } from '../verificacoesVencidas/components/VerificacoesVencidas'

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
  const permissoes = usePermissoesInterno()
  const [termo, setTermo] = useState('')
  const [parceiro, setParceiro] = useState('')
  const [chamado, setChamado] = useState('')

  const termoComAtraso = useDebounce(termo, DEBOUNCE_MS)
  const { data, isLoading, isError, refetch } = useResultadoBuscaInterna({ q: termoComAtraso })

  function aoTeclarNoCampo(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Escape') setTermo('')
  }

  const mostrarResultados = termoComAtraso.trim().length >= 2

  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">Início</h1>

      {/* Busca, parceiro e chamado numa caixa só: os três servem ao mesmo atendimento. */}
      <section
        aria-labelledby="atender-chamado-titulo"
        className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-white p-6"
      >
        <div>
          <h2 id="atender-chamado-titulo" className="text-subtitulo font-semibold text-ink">
            Atender um chamado
          </h2>
          <p className="text-sm text-muted">
            Ache o conteúdo certo e copie o link em segundos. O índice interno enxerga rascunho.
          </p>
        </div>

        <Input
          label="Buscar no Codex"
          id="busca-interna"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- a página inicial interna é a busca
          autoFocus
          placeholder="Código do erro, nome do provedor, campo…"
          maxLength={LIMITES_LACUNA_BUSCA.termo}
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          onKeyDown={aoTeclarNoCampo}
          role="searchbox"
        />

        {permissoes.lacunasBusca.adicionar && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Parceiro"
              hint="Vai junto com a lacuna quando uma busca não encontrar nada."
              maxLength={LIMITES_LACUNA_BUSCA.parceiro}
              value={parceiro}
              onChange={(evento) => setParceiro(evento.target.value)}
            />
            <Input
              label="Número do chamado"
              maxLength={LIMITES_LACUNA_BUSCA.numeroChamado}
              value={chamado}
              onChange={(evento) => setChamado(evento.target.value)}
            />
          </div>
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
          <ErrorState
            onRetry={() => {
              void refetch()
            }}
          />
        )}

        {!isLoading && !isError && mostrarResultados && data && data.totalGeral === 0 && (
          <EmptyState
            message="O Codex ainda não documenta esta rejeição."
            action={
              permissoes.lacunasBusca.adicionar && (
                <RegistrarLacunaBusca
                  termo={termoComAtraso}
                  parceiro={parceiro}
                  numeroChamado={chamado}
                />
              )
            }
          />
        )}

        {!isLoading && mostrarResultados && data && data.totalGeral > 0 && (
          <ResultadoBuscaInternaLista grupos={data.grupos} />
        )}
      </section>

      {permissoes.versoesProvedor.buscar && <VerificacoesVencidas />}

      {permissoes.lacunasBusca.buscar && (
        <FilaLacunasBusca podeAtualizar={permissoes.lacunasBusca.atualizar} />
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ATALHOS.map(({ to, titulo, descricao, Icone }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-5 hover:shadow-hover"
          >
            <Icone className="size-6 text-primary" aria-hidden="true" />
            <h2 className="text-card-titulo font-medium text-ink">{titulo}</h2>
            <p className="text-sm text-muted">{descricao}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
