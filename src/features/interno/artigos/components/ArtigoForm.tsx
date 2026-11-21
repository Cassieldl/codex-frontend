import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErroDoServidor } from '../../../../components/ui/ErroDoServidor'
import { Button } from '../../../../components/ui/Button'
import { RodapeDoFormulario } from '../../../../components/ui/RodapeDoFormulario'
import { ConteudoArtigo } from '../../../../components/ui/ConteudoArtigo'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import type { ErroDeCampoApi } from '../../../../utils/handleApiError'
import { ROTULO_TIPO_ARTIGO } from '../../../artigos/components/rotulosTipoArtigo'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { useErrosDeCampoDoServidor } from '../../utils/useErrosDeCampoDoServidor'
import type {
  ArtigoAdminDetalhe,
  ArtigoFormDto,
  CampoLayoutVinculadoArtigo,
  ErroVinculadoArtigo,
  TipoArtigo,
} from '../types/artigoAdmin'
import type { BuscaDeErrosDoArtigo, CamposLayoutDoArtigo } from '../types/referenciasArtigo'
import { AbasFormulario } from './AbasFormulario'
import { AjudaDeFormatacao } from './AjudaDeFormatacao'
import { VinculosDeCamposLayout } from './VinculosDeCamposLayout'
import { VinculosDeErros } from './VinculosDeErros'

/**
 * Valor de contrato em ASCII (`Mudanca`), rótulo com acento na exibição: o rótulo vem do mesmo
 * mapa que o índice público usa, para os dois nunca divergirem.
 */
const TIPO_OPTIONS: SelectOption[] = (
  ['Conceito', 'Procedimento', 'Mudanca', 'Configuracao'] satisfies TipoArtigo[]
).map((tipo) => ({ value: tipo, label: ROTULO_TIPO_ARTIGO[tipo] }))

const artigoSchema = z.object({
  titulo: z.string().min(1, 'O título é obrigatório.').max(200, 'Máximo de 200 caracteres.'),
  tipo: z.enum(['Conceito', 'Procedimento', 'Mudanca', 'Configuracao'] as const, {
    error: 'Selecione o tipo.',
  }),
  corpo: z.string().min(1, 'O corpo do artigo é obrigatório.'),
  campoLayoutIds: z.array(z.number()),
  erroIds: z.array(z.number()),
})

type ArtigoFormValores = z.infer<typeof artigoSchema>

const CAMPOS_DO_FORMULARIO = [
  'titulo',
  'tipo',
  'corpo',
  'campoLayoutIds',
  'erroIds',
] as const satisfies readonly (keyof ArtigoFormValores)[]

export interface ArtigoFormProps {
  initialData?: ArtigoAdminDetalhe
  /** Pré-preenchimento na criação (ex.: "Criar agora" do artigo reservado). */
  sugestao?: { titulo: string; tipo: TipoArtigo }
  buscaDeErros: BuscaDeErrosDoArtigo
  camposLayout: CamposLayoutDoArtigo
  onSubmit: (dto: ArtigoFormDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
  /** Erros por campo do 422: destacam o campo em vez de deixar só a mensagem geral. */
  errosDeCampo?: ErroDeCampoApi[]
}

function valoresIniciais(
  dado: ArtigoAdminDetalhe | undefined,
  sugestao: ArtigoFormProps['sugestao'],
): ArtigoFormValores {
  return {
    titulo: dado?.titulo ?? sugestao?.titulo ?? '',
    tipo: dado?.tipo ?? sugestao?.tipo ?? 'Conceito',
    corpo: dado?.corpo ?? '',
    campoLayoutIds: dado?.campoLayoutIds ?? [],
    erroIds: dado?.erroIds ?? [],
  }
}

function indexarPorId<T extends { id: number }>(itens: readonly T[] = []): Map<number, T> {
  return new Map(itens.map((item) => [item.id, item]))
}

/**
 * Resolve o rótulo de cada id escolhido, na ordem em que o detalhe os entrega e com os novos ao
 * final. Id sem rótulo conhecido continua na lista: nenhum vínculo pode sumir da tela e do envio.
 */
function resolverVinculos<T extends { id: number }>(
  ids: readonly number[],
  conhecidos: ReadonlyMap<number, T>,
  ordemDoDetalhe: readonly T[],
  semRotulo: (id: number) => T,
): T[] {
  const posicao = new Map(ordemDoDetalhe.map((item, indice) => [item.id, indice]))
  const ordenados = [...ids].sort(
    (a, b) =>
      (posicao.get(a) ?? ordemDoDetalhe.length + ids.indexOf(a)) -
      (posicao.get(b) ?? ordemDoDetalhe.length + ids.indexOf(b)),
  )
  return ordenados.map((id) => conhecidos.get(id) ?? semRotulo(id))
}

function erroSemRotulo(id: number): ErroVinculadoArtigo {
  return { id, codigo: `Erro ${id}`, titulo: '', desativado: false }
}

function campoSemRotulo(id: number): CampoLayoutVinculadoArtigo {
  return {
    id,
    nome: `Campo ${id}`,
    caminhoXml: '',
    versaoLayoutId: 0,
    versaoLayoutRotulo: '',
    desativado: false,
  }
}

/**
 * Formulário único de criar/editar artigo. Burro: recebe `onSubmit`/`onCancel` e as fontes de
 * referência por prop, e não conhece service nem hook de mutation; quem orquestra é a página.
 *
 * `slug` não é campo: o backend deriva do título, e para o artigo reservado renomear o título
 * nunca muda o slug.
 */
export function ArtigoForm({
  initialData,
  sugestao,
  buscaDeErros,
  camposLayout,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
  errosDeCampo,
}: ArtigoFormProps) {
  const [painelDoCorpo, setPainelDoCorpo] = useState('editar')
  const [errosConhecidos, setErrosConhecidos] = useState(() => indexarPorId(initialData?.erros))
  const [camposConhecidos, setCamposConhecidos] = useState(() =>
    indexarPorId(initialData?.camposLayout),
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ArtigoFormValores>({
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF só alcança campo com
    // `ref` e correria com o nosso, vencendo ora um ora outro conforme o agendamento.
    shouldFocusError: false,
    resolver: zodResolver(artigoSchema),
    defaultValues: valoresIniciais(initialData, sugestao),
  })

  useErrosDeCampoDoServidor(setError, CAMPOS_DO_FORMULARIO, errosDeCampo)

  const tipoAtual = watch('tipo')
  const corpoAtual = watch('corpo')
  const camposSelecionados = watch('campoLayoutIds')
  const errosSelecionados = watch('erroIds')

  const errosVinculados = resolverVinculos(
    errosSelecionados,
    errosConhecidos,
    initialData?.erros ?? [],
    erroSemRotulo,
  )
  const camposVinculados = resolverVinculos(
    camposSelecionados,
    camposConhecidos,
    initialData?.camposLayout ?? [],
    campoSemRotulo,
  )

  function removerVinculo(campo: 'campoLayoutIds' | 'erroIds', id: number) {
    const atual = campo === 'campoLayoutIds' ? camposSelecionados : errosSelecionados
    setValue(
      campo,
      atual.filter((item) => item !== id),
      { shouldValidate: true },
    )
  }

  function alternarErro(erro: ErroVinculadoArtigo) {
    if (errosSelecionados.includes(erro.id)) {
      removerVinculo('erroIds', erro.id)
      return
    }
    setErrosConhecidos((anteriores) => new Map(anteriores).set(erro.id, erro))
    setValue('erroIds', [...errosSelecionados, erro.id], { shouldValidate: true })
  }

  function alternarCampo(campo: CampoLayoutVinculadoArtigo) {
    if (camposSelecionados.includes(campo.id)) {
      removerVinculo('campoLayoutIds', campo.id)
      return
    }
    setCamposConhecidos((anteriores) => new Map(anteriores).set(campo.id, campo))
    setValue('campoLayoutIds', [...camposSelecionados, campo.id], { shouldValidate: true })
  }

  function aoSubmeter(valores: ArtigoFormValores) {
    onSubmit({
      titulo: valores.titulo,
      tipo: valores.tipo,
      corpo: valores.corpo,
      campoLayoutIds: valores.campoLayoutIds,
      erroIds: valores.erroIds,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(aoSubmeter, focarPrimeiroCampoInvalido)}
      className="flex flex-col gap-5"
      noValidate
    >
      <ErroDoServidor mensagem={erroServidor} />

      {initialData?.reservado && (
        <p role="status" className="text-xs text-muted">
          Artigo obrigatório: a rota pública <code>/como-funciona</code> aponta para ele. Renomear o
          título não muda o endereço, e o artigo não pode ser removido nem despublicado.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input label="Título" required error={errors.titulo?.message} {...register('titulo')} />
        <Select
          label="Tipo"
          required
          options={TIPO_OPTIONS}
          value={tipoAtual}
          // Editável de propósito: corrigir uma classificação errada apagando e recriando
          // quebraria o slug público.
          onValueChange={(valor) => setValue('tipo', valor as TipoArtigo, { shouldValidate: true })}
          error={errors.tipo?.message}
        />
      </div>

      <AbasFormulario
        ariaLabel="Corpo do artigo"
        valorAtivo={painelDoCorpo}
        onValorAtivoChange={setPainelDoCorpo}
        abas={[
          {
            valor: 'editar',
            rotulo: 'Editar',
            conteudo: (
              <div className="flex flex-col gap-3">
                <Textarea
                  label="Corpo"
                  required
                  rows={16}
                  hint="Markdown restrito: títulos (##/###), listas, tabelas, links, código. HTML não é interpretado."
                  error={errors.corpo?.message}
                  {...register('corpo')}
                />
                <AjudaDeFormatacao />
              </div>
            ),
          },
          {
            valor: 'pre-visualizar',
            rotulo: 'Pré-visualizar',
            conteudo: corpoAtual.trim() ? (
              // Mesmo renderizador da página pública: um erro de sintaxe de tabela aparece aqui,
              // não só para o leitor depois de publicado.
              <ConteudoArtigo corpo={corpoAtual} />
            ) : (
              <p className="text-xs text-muted italic">
                Nada escrito ainda: a pré-visualização aparece conforme você escreve.
              </p>
            ),
          },
        ]}
      />

      <VinculosDeCamposLayout
        vinculados={camposVinculados}
        fonte={camposLayout}
        onAlternar={alternarCampo}
        onRemover={(id) => removerVinculo('campoLayoutIds', id)}
        erro={errors.campoLayoutIds?.message}
      />

      <VinculosDeErros
        vinculados={errosVinculados}
        busca={buscaDeErros}
        onAlternar={alternarErro}
        onRemover={(id) => removerVinculo('erroIds', id)}
        erro={errors.erroIds?.message}
      />

      <RodapeDoFormulario>
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          Salvar
        </Button>
      </RodapeDoFormulario>
    </form>
  )
}
