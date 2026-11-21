import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { z } from 'zod'
import { ErroDoServidor } from '../../../../components/ui/ErroDoServidor'
import { Button } from '../../../../components/ui/Button'
import { RodapeDoFormulario } from '../../../../components/ui/RodapeDoFormulario'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import type { AvisoAdmin, EscopoAviso, SeveridadeAviso } from '../types/avisoAdmin'

const SEVERIDADE_OPTIONS: SelectOption[] = [
  { value: 'Critico', label: 'Crítico' },
  { value: 'Alerta', label: 'Alerta' },
  { value: 'Informativo', label: 'Informativo' },
]

const avisoSchema = z.object({
  severidade: z.enum(['Critico', 'Alerta', 'Informativo'] as const, {
    error: 'Selecione a severidade.',
  }),
  titulo: z.string().min(1, 'O título é obrigatório.').max(200, 'Máximo de 200 caracteres.'),
  corpo: z
    .string()
    .min(1, 'O corpo do aviso é obrigatório.')
    .max(4000, 'Máximo de 4000 caracteres.'),
  vigenciaInicio: z.string().optional().or(z.literal('')),
  camposAfetadosIds: z.array(z.string()),
})

type AvisoFormValores = z.infer<typeof avisoSchema>

export interface AvisoFormDto {
  severidade: SeveridadeAviso
  titulo: string
  corpo: string
  vigenciaInicio?: string
  /** Só enviado pelo chamador quando `escopo === 'Versao'`. */
  campoVersaoIds: number[]
}

export interface OpcaoCampoAfetado {
  id: number
  rotulo: string
}

export interface AvisoFormProps {
  /** Determina a própria estrutura do formulário (§5.7) - nunca um campo de seleção dentro dele. */
  escopo: EscopoAviso
  initialData?: AvisoAdmin
  /** Só relevante quando `escopo === 'Versao'`. */
  opcoesCamposAfetados?: OpcaoCampoAfetado[]
  onSubmit: (dto: AvisoFormDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
}

function valoresIniciais(dado?: AvisoAdmin): AvisoFormValores {
  return {
    severidade: dado?.severidade ?? 'Informativo',
    titulo: dado?.titulo ?? '',
    corpo: dado?.corpo ?? '',
    vigenciaInicio: dado?.vigenciaInicio ?? '',
    camposAfetadosIds: (dado?.camposAfetadosIds ?? []).map(String),
  }
}

export function AvisoForm({
  escopo,
  initialData,
  opcoesCamposAfetados = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
}: AvisoFormProps) {
  const camposAfetadosId = useId()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AvisoFormValores>({
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF só alcança campo com
    // `ref` e correria com o nosso, vencendo ora um ora outro conforme o agendamento.
    shouldFocusError: false,
    resolver: zodResolver(avisoSchema),
    defaultValues: valoresIniciais(initialData),
  })

  const severidadeAtual = watch('severidade')
  const camposAfetadosAtual = watch('camposAfetadosIds')

  function aoSubmeter(valores: AvisoFormValores) {
    onSubmit({
      severidade: valores.severidade,
      titulo: valores.titulo,
      corpo: valores.corpo,
      vigenciaInicio: valores.vigenciaInicio || undefined,
      // Estrutural: só monta a lista quando o escopo é versão - o formulário
      // de aviso de provedor nem renderiza o campo (não é "desabilitado").
      campoVersaoIds: escopo === 'Versao' ? valores.camposAfetadosIds.map(Number) : [],
    })
  }

  function alternarCampoAfetado(idCampo: string) {
    const jaSelecionado = camposAfetadosAtual.includes(idCampo)
    const proximo = jaSelecionado
      ? camposAfetadosAtual.filter((id) => id !== idCampo)
      : [...camposAfetadosAtual, idCampo]
    setValue('camposAfetadosIds', proximo)
  }

  return (
    <form
      onSubmit={handleSubmit(aoSubmeter, focarPrimeiroCampoInvalido)}
      className="flex flex-col gap-5"
      noValidate
    >
      <ErroDoServidor mensagem={erroServidor} />

      <p className="text-xs text-muted">
        {escopo === 'Provedor'
          ? 'Este aviso vale para o provedor inteiro, em qualquer versão.'
          : 'Este aviso vale só para esta versão.'}
      </p>

      <Select
        label="Severidade"
        required
        options={SEVERIDADE_OPTIONS}
        value={severidadeAtual}
        onValueChange={(valor) =>
          setValue('severidade', valor as SeveridadeAviso, { shouldValidate: true })
        }
        error={errors.severidade?.message}
      />

      <Input label="Título" required error={errors.titulo?.message} {...register('titulo')} />

      <Textarea
        label="Corpo"
        required
        rows={5}
        error={errors.corpo?.message}
        {...register('corpo')}
      />

      <Input
        label="Vigência de início"
        type="date"
        error={errors.vigenciaInicio?.message}
        {...register('vigenciaInicio')}
      />

      {/* U8: "campos afetados" só existe no escopo de versão; o formulário de
          aviso de provedor nem chega a renderizar este bloco. */}
      {escopo === 'Versao' && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-xs font-semibold text-ink lg:text-sm">
            Campos afetados
          </legend>
          <div className="flex flex-col gap-1.5">
            {opcoesCamposAfetados.map((opcao) => {
              const idCampo = String(opcao.id)
              const inputId = `${camposAfetadosId}-${idCampo}`
              return (
                <label
                  key={idCampo}
                  htmlFor={inputId}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    className="size-4 rounded-[var(--radius-check)]"
                    checked={camposAfetadosAtual.includes(idCampo)}
                    onChange={() => alternarCampoAfetado(idCampo)}
                  />
                  {opcao.rotulo}
                </label>
              )
            })}
            {opcoesCamposAfetados.length === 0 && (
              <p className="text-xs text-muted italic">
                Nenhum campo cadastrado nesta versão ainda.
              </p>
            )}
          </div>
        </fieldset>
      )}

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
