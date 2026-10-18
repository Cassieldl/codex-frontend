import { useId, type KeyboardEvent } from 'react'
import { Input } from '../../../../components/ui/Input'
import type { ErroVinculadoArtigo } from '../types/artigoAdmin'
import type { BuscaDeErrosDoArtigo } from '../types/referenciasArtigo'
import { ListaDeVinculos } from './ListaDeVinculos'

const formatoDeContagem = new Intl.NumberFormat('pt-BR')

export interface VinculosDeErrosProps {
  vinculados: ErroVinculadoArtigo[]
  busca: BuscaDeErrosDoArtigo
  onAlternar: (erro: ErroVinculadoArtigo) => void
  onRemover: (id: number) => void
  erro?: string
}

function RotuloDoErro({ erro }: { erro: ErroVinculadoArtigo }) {
  return (
    <span>
      <span className="font-mono text-xs">{erro.codigo}</span> {erro.titulo}
    </span>
  )
}

// Enter no campo de busca submeteria o formulário do artigo inteiro.
function impedirEnvioPeloEnter(evento: KeyboardEvent<HTMLInputElement>) {
  if (evento.key === 'Enter') evento.preventDefault()
}

function SituacaoDaBusca({ busca }: { busca: BuscaDeErrosDoArtigo }) {
  if (busca.isError) {
    return <p className="text-xs text-error-texto">Não foi possível buscar os erros agora.</p>
  }

  if (busca.resultados.length === 0) {
    return (
      <p role="status" className="text-xs text-muted italic">
        {busca.isBuscando ? 'Buscando erros…' : 'Nenhum erro encontrado.'}
      </p>
    )
  }

  if (busca.totalEncontrado > busca.resultados.length) {
    return (
      <p role="status" className="text-xs text-muted">
        Mostrando {busca.resultados.length} de {formatoDeContagem.format(busca.totalEncontrado)}.
        Refine a busca para encontrar outros.
      </p>
    )
  }

  return null
}

/** Erros relacionados: os vinculados à vista e a busca no servidor para vincular outros. */
export function VinculosDeErros({
  vinculados,
  busca,
  onAlternar,
  onRemover,
  erro,
}: VinculosDeErrosProps) {
  const prefixoDosIds = useId()
  const idsVinculados = new Set(vinculados.map((vinculado) => vinculado.id))

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-xs font-semibold text-ink lg:text-sm">Erros relacionados</legend>

      <ListaDeVinculos
        titulo="Erros vinculados"
        mensagemVazia="Nenhum erro vinculado."
        onRemover={onRemover}
        vinculos={vinculados.map((vinculado) => ({
          id: vinculado.id,
          rotulo: <RotuloDoErro erro={vinculado} />,
          nomeAcessivel: `o erro ${vinculado.codigo}`,
          desativado: vinculado.desativado,
        }))}
      />

      {erro && <p className="text-xs text-error-texto">{erro}</p>}

      <Input
        label="Buscar erro para vincular"
        hint="Código ou texto da mensagem."
        type="search"
        value={busca.termo}
        onChange={(evento) => busca.onTermoChange(evento.target.value)}
        onKeyDown={impedirEnvioPeloEnter}
      />

      <SituacaoDaBusca busca={busca} />

      {busca.resultados.length > 0 && (
        <ul
          aria-label="Erros encontrados"
          className="flex max-h-64 flex-col gap-1.5 overflow-y-auto"
        >
          {busca.resultados.map((resultado) => {
            const inputId = `${prefixoDosIds}-${resultado.id}`
            return (
              <li key={resultado.id}>
                <label htmlFor={inputId} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    id={inputId}
                    type="checkbox"
                    className="size-4 rounded-[var(--radius-check)]"
                    checked={idsVinculados.has(resultado.id)}
                    onChange={() => onAlternar(resultado)}
                  />
                  <RotuloDoErro erro={resultado} />
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}
