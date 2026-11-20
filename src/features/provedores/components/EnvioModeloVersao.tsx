import { Link } from '@tanstack/react-router'
import { useId, useMemo, useState } from 'react'
import { AlternadorSegmentado } from '../../../components/ui/AlternadorSegmentado'
import type { AlternadorSegmentadoProps } from '../../../components/ui/AlternadorSegmentado'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Select } from '../../../components/ui/Select'
import { Skeleton } from '../../../components/ui/Skeleton'
import { rotuloParaNomeDeArquivo } from '../../../utils/baixarArquivoDeTexto'
import { VisualizadorDaEstrutura } from '../../layout/components/VisualizadorDaEstrutura'
import type { DestinoNaLinhaDaTabela } from '../../layout/components/VisualizadorDaEstrutura'
import { FORMATOS_DA_ESTRUTURA, ROTULO_DO_FORMATO } from '../../layout/types/estruturaLayout'
import type { FormatoDaEstrutura } from '../../layout/types/estruturaLayout'
import { ErroEnvioModeloIndisponivel, useEnvioModelo } from '../hooks/useEnvioModelo'
import {
  ALCANCES_DO_ENVIO_MODELO,
  CENARIO_PADRAO,
  ehCenarioDoEnvioModelo,
  ROTULO_DO_ALCANCE,
  ROTULO_DO_CENARIO,
} from '../types/envioModelo'
import type { AlcanceDoEnvioModelo, CenarioDoEnvioModelo } from '../types/envioModelo'
import type { GrupoCampoVersao } from '../types/versaoProvedorPagina'
import { ROTA_DA_ABA } from '../utils/abasDoProvedor'
import { cenariosParaEscolha, mesmosCenarios } from '../utils/cenariosDoEnvioModelo'
import { construirIdLinhaCampo } from '../utils/destaqueAncora'
import { ID_SECAO_ENVIO_MODELO } from '../utils/secoesDoProvedor'

export interface EnvioModeloVersaoProps {
  provedorSlug: string
  versaoSlug: string
  provedorNome: string
  versaoRotulo: string
  camposPorGrupo: GrupoCampoVersao[]
}

const NOME_CURTO_DO_FORMATO: Record<FormatoDaEstrutura, string> = {
  xml: 'XML',
  json: 'JSON',
}

function slugsDaReforma(camposPorGrupo: GrupoCampoVersao[]): ReadonlySet<string> {
  return new Set(
    camposPorGrupo.flatMap((grupo) =>
      grupo.campos.filter((campo) => campo.reformaTributaria).map((campo) => campo.campoLayoutSlug),
    ),
  )
}

function nomesDosCampos(camposPorGrupo: GrupoCampoVersao[]): ReadonlyMap<string, string> {
  return new Map(
    camposPorGrupo.flatMap((grupo) =>
      grupo.campos.map((campo) => [campo.campoLayoutSlug, campo.nome] as const),
    ),
  )
}

/** Alternador com o rótulo visível em cima; o nome acessível vem do próprio grupo de rádio. */
function EscolhaSegmentadaComRotulo<T extends string>(props: AlternadorSegmentadoProps<T>) {
  return (
    <div className="flex flex-col gap-0.5">
      <span aria-hidden="true" className="text-xs font-normal text-ink lg:text-sm">
        {props.rotulo}
      </span>
      <AlternadorSegmentado tamanho="compacto" {...props} />
    </div>
  )
}

/**
 * "Envio modelo" da página da versão: o envio mínimo ou máximo em XML ou JSON, com cada tag de
 * campo levando à linha dele na tabela acima. O cenário só aparece quando a versão aceita mais
 * de um. A falha fica dentro da seção.
 */
export function EnvioModeloVersao({
  provedorSlug,
  versaoSlug,
  provedorNome,
  versaoRotulo,
  camposPorGrupo,
}: EnvioModeloVersaoProps) {
  const tituloId = useId()
  const [alcance, setAlcance] = useState<AlcanceDoEnvioModelo>('minimo')
  const [formato, setFormato] = useState<FormatoDaEstrutura>('xml')
  const [cenario, setCenario] = useState<CenarioDoEnvioModelo>(CENARIO_PADRAO)
  // Cada versão monta a seção de novo (key na rota), então o estado não vaza entre versões.
  // A lista sobrevive à troca de alcance e cenário: sem ela o seletor sumiria a cada nova busca,
  // e um erro no cenário estrangeiro prenderia a pessoa nele.
  const [cenariosDisponiveis, setCenariosDisponiveis] = useState<CenarioDoEnvioModelo[]>([
    CENARIO_PADRAO,
  ])

  const {
    data: envio,
    isLoading,
    error,
    refetch,
  } = useEnvioModelo(provedorSlug, versaoSlug, alcance, cenario)

  if (envio) {
    const recebidos = cenariosParaEscolha(envio.cenariosDisponiveis ?? [])
    if (!mesmosCenarios(recebidos, cenariosDisponiveis)) setCenariosDisponiveis(recebidos)
    if (!recebidos.includes(cenario)) setCenario(CENARIO_PADRAO)
  }

  const nomePorSlug = useMemo(() => nomesDosCampos(camposPorGrupo), [camposPorGrupo])
  const destino = useMemo<DestinoNaLinhaDaTabela>(
    () => ({
      tipo: 'linhaDaTabela',
      camposDaTabela: new Set(nomePorSlug.keys()),
      camposDaReforma: slugsDaReforma(camposPorGrupo),
    }),
    [nomePorSlug, camposPorGrupo],
  )

  const indisponivel = error instanceof ErroEnvioModeloIndisponivel
  const raiz = !isLoading && !error ? envio?.[formato] : undefined
  const comCenarios = cenariosDisponiveis.length > 1
  const rotuloDoCenario = comCenarios ? `, ${ROTULO_DO_CENARIO[cenario].toLowerCase()},` : ''
  const rotuloDoEnvio = `envio modelo ${ROTULO_DO_ALCANCE[alcance].toLowerCase()}${rotuloDoCenario} em ${ROTULO_DO_FORMATO[formato]}`
  const camposSemPosicao = !isLoading && !error ? (envio?.camposSemPosicao ?? []) : []

  return (
    <section
      id={ID_SECAO_ENVIO_MODELO}
      aria-labelledby={tituloId}
      className="flex scroll-mt-24 flex-col gap-4"
    >
      {/* A aba já diz "Envio modelo": o título fica só para o leitor de tela e para nomear a seção. */}
      <h2 id={tituloId} className="sr-only">
        Envio modelo
      </h2>

      {!indisponivel && (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-card">
          {comCenarios && (
            <Select
              label="Cenário"
              options={cenariosDisponiveis.map((opcao) => ({
                value: opcao,
                label: ROTULO_DO_CENARIO[opcao],
              }))}
              value={cenario}
              onValueChange={(valor) => {
                if (ehCenarioDoEnvioModelo(valor)) setCenario(valor)
              }}
              className="w-full min-w-56 flex-1 sm:w-auto"
            />
          )}
          <EscolhaSegmentadaComRotulo
            rotulo="Alcance"
            opcoes={ALCANCES_DO_ENVIO_MODELO}
            rotuloDaOpcao={ROTULO_DO_ALCANCE}
            selecionada={alcance}
            onSelecionar={setAlcance}
          />
          <EscolhaSegmentadaComRotulo
            rotulo="Formato"
            opcoes={FORMATOS_DA_ESTRUTURA}
            rotuloDaOpcao={ROTULO_DO_FORMATO}
            selecionada={formato}
            onSelecionar={setFormato}
          />
        </div>
      )}

      {!indisponivel && (
        <div className="flex max-w-[100ch] flex-col gap-0.5 text-sm text-muted">
          <p>
            {NOME_CURTO_DO_FORMATO[formato]} de exemplo do {provedorNome} {versaoRotulo}, preenchido
            com valores fictícios.
          </p>
          <p>
            O mínimo traz só o que o esquema do provedor obriga. A prefeitura pode exigir outros
            campos por regra própria.
          </p>
        </div>
      )}

      {isLoading && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Carregando o envio modelo…</span>
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {indisponivel && (
        <EmptyState
          message="Consulte os campos desta versão na aba Campos."
          action={
            <Link
              to={ROTA_DA_ABA.campos}
              params={{ provedorSlug }}
              className="text-sm font-semibold text-primary-medium hover:underline"
            >
              Ver os campos
            </Link>
          }
        />
      )}

      {error && !indisponivel && <ErrorState onRetry={() => void refetch()} />}

      {camposSemPosicao.length > 0 && (
        <div
          role="note"
          className="flex flex-col gap-1 rounded-[var(--radius-aviso)] border border-alert-info-borda bg-alert-info px-3 py-2 text-sm text-ink"
        >
          <p>Campos desta versão que não aparecem no envio modelo:</p>
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
                      className="rounded font-semibold text-primary-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover"
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
          key={`${alcance}-${cenario}-${formato}`}
          raiz={raiz}
          formato={formato}
          destino={destino}
          nomeBaseDoArquivo={`envio-modelo-${provedorSlug}-${rotuloParaNomeDeArquivo(versaoSlug)}-${alcance}${cenario === CENARIO_PADRAO ? '' : `-${cenario}`}`}
          rotuloDaRegiao={`Texto do ${rotuloDoEnvio}`}
          rotuloDaCopia={`Copiar o ${rotuloDoEnvio}`}
          superficie="escura"
        />
      )}
    </section>
  )
}
