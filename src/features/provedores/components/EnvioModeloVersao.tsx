import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { rotuloParaNomeDeArquivo } from '../../../utils/baixarArquivoDeTexto'
import { formatarVersaoLayout } from '../../../utils/versaoDoLayout'
import { VisualizadorDaEstrutura } from '../../layout/components/VisualizadorDaEstrutura'
import type { DestinoNaLinhaDaTabela } from '../../layout/components/VisualizadorDaEstrutura'
import { FORMATOS_DA_ESTRUTURA, ROTULO_DO_FORMATO } from '../../layout/types/estruturaLayout'
import type { FormatoDaEstrutura } from '../../layout/types/estruturaLayout'
import { ErroEnvioModeloIndisponivel, useEnvioModelo } from '../hooks/useEnvioModelo'
import { ALCANCES_DO_ENVIO_MODELO, ROTULO_DO_ALCANCE } from '../types/envioModelo'
import type { AlcanceDoEnvioModelo } from '../types/envioModelo'
import type { GrupoCampoVersao } from '../types/versaoProvedorPagina'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'

export interface EnvioModeloVersaoProps {
  provedorSlug: string
  versaoSlug: string
  camposPorGrupo: GrupoCampoVersao[]
}

interface GrupoDeOpcoesProps<T extends string> {
  rotulo: string
  opcoes: readonly T[]
  rotuloDaOpcao: Record<T, string>
  selecionada: T
  onSelecionar: (opcao: T) => void
}

const CLASSE_DA_OPCAO =
  'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1 text-sm text-ink hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light'

const CLASSE_DA_OPCAO_PRESSIONADA = 'border-2 border-primary bg-alert-info font-semibold'

// Borda e fundo só num dos ramos: sem tailwind-merge, duas classes do mesmo tipo brigam.
const CLASSE_DA_OPCAO_SOLTA = 'border border-border-control bg-white'

/** Botões de alternância com `aria-pressed`: a opção escolhida tem borda, fundo e ícone. */
function GrupoDeOpcoes<T extends string>({
  rotulo,
  opcoes,
  rotuloDaOpcao,
  selecionada,
  onSelecionar,
}: GrupoDeOpcoesProps<T>) {
  const rotuloId = useId()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span id={rotuloId} className="text-xs font-medium text-muted">
        {rotulo}
      </span>
      <div role="group" aria-labelledby={rotuloId} className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => {
          const pressionada = opcao === selecionada

          return (
            <button
              key={opcao}
              type="button"
              aria-pressed={pressionada}
              onClick={() => onSelecionar(opcao)}
              className={clsx(
                CLASSE_DA_OPCAO,
                pressionada ? CLASSE_DA_OPCAO_PRESSIONADA : CLASSE_DA_OPCAO_SOLTA,
              )}
            >
              {pressionada && <Check aria-hidden="true" className="size-3.5 shrink-0" />}
              {rotuloDaOpcao[opcao]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function nomesDosCampos(camposPorGrupo: GrupoCampoVersao[]): ReadonlyMap<string, string> {
  return new Map(
    camposPorGrupo.flatMap((grupo) =>
      grupo.campos.map((campo) => [campo.campoLayoutSlug, campo.nome] as const),
    ),
  )
}

/**
 * "Envio modelo" da página da versão: o envio mínimo ou máximo em XML ou JSON, com cada tag de
 * campo levando à linha dele na tabela acima. A falha fica dentro da seção.
 */
export function EnvioModeloVersao({
  provedorSlug,
  versaoSlug,
  camposPorGrupo,
}: EnvioModeloVersaoProps) {
  const tituloId = useId()
  const [alcance, setAlcance] = useState<AlcanceDoEnvioModelo>('minimo')
  const [formato, setFormato] = useState<FormatoDaEstrutura>('xml')

  const {
    data: envio,
    isLoading,
    error,
    refetch,
  } = useEnvioModelo(provedorSlug, versaoSlug, alcance)

  const nomePorSlug = useMemo(() => nomesDosCampos(camposPorGrupo), [camposPorGrupo])
  const destino = useMemo<DestinoNaLinhaDaTabela>(
    () => ({ tipo: 'linhaDaTabela', camposDaTabela: new Set(nomePorSlug.keys()) }),
    [nomePorSlug],
  )

  const indisponivel = error instanceof ErroEnvioModeloIndisponivel
  const raiz = !isLoading && !error ? envio?.[formato] : undefined
  const rotuloDoEnvio = `envio modelo ${ROTULO_DO_ALCANCE[alcance].toLowerCase()} em ${ROTULO_DO_FORMATO[formato]}`
  const camposSemPosicao = !isLoading && !error ? (envio?.camposSemPosicao ?? []) : []

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id={tituloId} className="text-subtitulo font-semibold text-ink">
          Envio modelo
        </h2>
        <p className="max-w-[70ch] text-sm text-ink/70">
          {envio
            ? `Um envio desta versão no Layout InvoiCy ${formatarVersaoLayout(envio.versaoLayoutRotulo)}, com um valor de exemplo em cada tag.`
            : 'Um envio desta versão, com um valor de exemplo em cada tag.'}
        </p>
        <p className="max-w-[70ch] text-xs text-muted">
          O mínimo traz só o que o esquema do provedor obriga. A prefeitura pode exigir outros
          campos por regra própria.
        </p>
      </header>

      {!indisponivel && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <GrupoDeOpcoes
            rotulo="Alcance"
            opcoes={ALCANCES_DO_ENVIO_MODELO}
            rotuloDaOpcao={ROTULO_DO_ALCANCE}
            selecionada={alcance}
            onSelecionar={setAlcance}
          />
          <GrupoDeOpcoes
            rotulo="Formato"
            opcoes={FORMATOS_DA_ESTRUTURA}
            rotuloDaOpcao={ROTULO_DO_FORMATO}
            selecionada={formato}
            onSelecionar={setFormato}
          />
        </div>
      )}

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Carregando o envio modelo…</span>
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {indisponivel && <EmptyState message="Envio modelo indisponível para esta versão." />}

      {error && !indisponivel && <ErrorState onRetry={() => void refetch()} />}

      {camposSemPosicao.length > 0 && (
        <div
          role="note"
          className="flex flex-col gap-1 rounded-[var(--radius-control)] bg-alert-info px-3 py-2 text-sm text-ink"
        >
          <p>Estes campos da versão não têm posição no envio modelo e ficam fora do texto:</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {camposSemPosicao.map((slug) => {
              const nome = nomePorSlug.get(slug)

              return (
                <li key={slug}>
                  {nome === undefined ? (
                    <span className="font-mono">{slug}</span>
                  ) : (
                    <a
                      href={`#${construirIdLinhaCampo(slug)}`}
                      className="rounded font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
                    >
                      {nome}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {raiz && raiz.filhos.length === 0 && (
        <EmptyState message={`O ${rotuloDoEnvio} está vazio.`} />
      )}

      {raiz && raiz.filhos.length > 0 && (
        <VisualizadorDaEstrutura
          key={`${alcance}-${formato}`}
          raiz={raiz}
          formato={formato}
          destino={destino}
          nomeBaseDoArquivo={`envio-modelo-${provedorSlug}-${rotuloParaNomeDeArquivo(versaoSlug)}-${alcance}`}
          rotuloDaRegiao={`Texto do ${rotuloDoEnvio}`}
          rotuloDaCopia={`Copiar o ${rotuloDoEnvio}`}
        />
      )}
    </section>
  )
}
