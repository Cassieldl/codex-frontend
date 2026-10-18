import { useId, useState, type KeyboardEvent } from 'react'
import { Input } from '../../../../components/ui/Input'
import { Select } from '../../../../components/ui/Select'
import type { CampoLayoutVinculadoArtigo } from '../types/artigoAdmin'
import type { CamposLayoutDoArtigo } from '../types/referenciasArtigo'
import { ListaDeVinculos } from './ListaDeVinculos'

export interface VinculosDeCamposLayoutProps {
  vinculados: CampoLayoutVinculadoArtigo[]
  fonte: CamposLayoutDoArtigo
  onAlternar: (campo: CampoLayoutVinculadoArtigo) => void
  onRemover: (id: number) => void
  erro?: string
}

function RotuloDoCampo({
  campo,
  comVersao,
}: {
  campo: CampoLayoutVinculadoArtigo
  comVersao: boolean
}) {
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <span>{campo.nome}</span>
      <span className="font-mono text-xs text-muted [overflow-wrap:anywhere]">
        {campo.caminhoXml}
      </span>
      {comVersao && <span className="text-xs text-muted">versão {campo.versaoLayoutRotulo}</span>}
    </span>
  )
}

// Enter no filtro submeteria o formulário do artigo inteiro.
function impedirEnvioPeloEnter(evento: KeyboardEvent<HTMLInputElement>) {
  if (evento.key === 'Enter') evento.preventDefault()
}

function casaComFiltro(campo: CampoLayoutVinculadoArtigo, filtro: string): boolean {
  const termo = filtro.trim().toLocaleLowerCase('pt-BR')
  if (!termo) return true
  return `${campo.nome} ${campo.caminhoXml}`.toLocaleLowerCase('pt-BR').includes(termo)
}

function SituacaoDosCampos({
  fonte,
  quantidade,
}: {
  fonte: CamposLayoutDoArtigo
  quantidade: number
}) {
  if (fonte.isError) {
    return <p className="text-xs text-error-texto">Não foi possível carregar os campos agora.</p>
  }
  if (fonte.isLoading) {
    return (
      <p role="status" className="text-xs text-muted italic">
        Carregando campos…
      </p>
    )
  }
  if (quantidade === 0) {
    return <p className="text-xs text-muted italic">Nenhum campo encontrado nesta versão.</p>
  }
  return null
}

/** Campos do layout relacionados: os vinculados à vista e os campos da versão escolhida. */
export function VinculosDeCamposLayout({
  vinculados,
  fonte,
  onAlternar,
  onRemover,
  erro,
}: VinculosDeCamposLayoutProps) {
  const prefixoDosIds = useId()
  const [filtro, setFiltro] = useState('')
  const idsVinculados = new Set(vinculados.map((vinculado) => vinculado.id))
  const camposVisiveis = fonte.campos.filter((campo) => casaComFiltro(campo, filtro))

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-xs font-semibold text-ink lg:text-sm">
        Campos do layout relacionados
      </legend>

      <ListaDeVinculos
        titulo="Campos vinculados"
        mensagemVazia="Nenhum campo vinculado."
        onRemover={onRemover}
        vinculos={vinculados.map((vinculado) => ({
          id: vinculado.id,
          rotulo: <RotuloDoCampo campo={vinculado} comVersao />,
          nomeAcessivel: `o campo ${vinculado.nome}`,
          desativado: vinculado.desativado,
        }))}
      />

      {erro && <p className="text-xs text-error-texto">{erro}</p>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Versão do layout"
          options={fonte.versoes.map((versao) => ({
            value: String(versao.id),
            label: versao.rotulo,
          }))}
          value={fonte.versaoSelecionadaId === null ? null : String(fonte.versaoSelecionadaId)}
          onValueChange={(valor) => fonte.onVersaoChange(Number(valor))}
          disabled={fonte.versoes.length === 0}
        />
        <Input
          label="Filtrar campos desta versão"
          type="search"
          value={filtro}
          onChange={(evento) => setFiltro(evento.target.value)}
          onKeyDown={impedirEnvioPeloEnter}
        />
      </div>

      <SituacaoDosCampos fonte={fonte} quantidade={camposVisiveis.length} />

      {!fonte.isLoading && !fonte.isError && camposVisiveis.length > 0 && (
        <ul
          aria-label="Campos da versão escolhida"
          className="flex max-h-64 flex-col gap-1.5 overflow-y-auto"
        >
          {camposVisiveis.map((campo) => {
            const inputId = `${prefixoDosIds}-${campo.id}`
            return (
              <li key={campo.id}>
                <label htmlFor={inputId} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    id={inputId}
                    type="checkbox"
                    className="size-4 shrink-0 rounded-[var(--radius-check)]"
                    checked={idsVinculados.has(campo.id)}
                    onChange={() => onAlternar(campo)}
                  />
                  <RotuloDoCampo campo={campo} comVersao={false} />
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}
