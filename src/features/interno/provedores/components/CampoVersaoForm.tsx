import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { z } from 'zod'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import type {
  CampoVersaoAdmin,
  CriarCampoVersaoDto,
  EstadoPreenchimentoCampo,
  OpcaoCampoLayout,
} from '../types/campoVersaoAdmin'

const ESTADOS_OPTIONS: SelectOption[] = [
  { value: 'Obrigatorio', label: 'Obrigatório' },
  { value: 'Opcional', label: 'Opcional' },
  { value: 'Condicional', label: 'Condicional' },
]

// U4 — campo canônico é FK obrigatória, nunca texto livre: por isso
// `campoLayoutId` é `Select` alimentado por `opcoesCampoLayout`, nunca `Input`.
const campoVersaoSchema = z
  .object({
    campoLayoutId: z.string().min(1, 'Selecione o campo canônico.'),
    tipo: z.string().min(1, 'O tipo é obrigatório.').max(50, 'Máximo de 50 caracteres.'),
    tamanho: z.string().max(50, 'Máximo de 50 caracteres.').optional().or(z.literal('')),
    mascara: z.string().max(100, 'Máximo de 100 caracteres.').optional().or(z.literal('')),
    dominio: z.string().max(200, 'Máximo de 200 caracteres.').optional().or(z.literal('')),
    estadoPreenchimento: z.enum(['Obrigatorio', 'Opcional', 'Condicional'] as const, {
      error: 'Selecione o estado de preenchimento.',
    }),
    condicao: z.string().max(500, 'Máximo de 500 caracteres.').optional().or(z.literal('')),
    exemplo: z.string().max(500, 'Máximo de 500 caracteres.').optional().or(z.literal('')),
    notaPreenchimento: z
      .string()
      .max(1000, 'Máximo de 1000 caracteres.')
      .optional()
      .or(z.literal('')),
    destinoXml: z.string().max(300, 'Máximo de 300 caracteres.').optional().or(z.literal('')),
    notaTransformacao: z
      .string()
      .max(1000, 'Máximo de 1000 caracteres.')
      .optional()
      .or(z.literal('')),
    ordem: z
      .number('A ordem precisa ser um número.')
      .int('A ordem precisa ser um número inteiro.')
      .min(0, 'A ordem não pode ser negativa.'),
  })
  .superRefine((valores, ctx) => {
    // Condição obrigatória só quando o estado de preenchimento é Condicional
    // (§7.9) — validação no submit, nunca retroativa a cada tecla.
    if (valores.estadoPreenchimento === 'Condicional' && !valores.condicao?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['condicao'],
        message: 'A condição é obrigatória quando o estado de preenchimento é Condicional.',
      })
    }
  })

type CampoVersaoFormValores = z.infer<typeof campoVersaoSchema>

export interface CampoVersaoFormProps {
  initialData?: CampoVersaoAdmin
  opcoesCampoLayout: OpcaoCampoLayout[]
  onSubmit: (dto: CriarCampoVersaoDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
}

function valoresIniciais(dado?: CampoVersaoAdmin): CampoVersaoFormValores {
  return {
    campoLayoutId: dado ? String(dado.campoLayoutId) : '',
    tipo: dado?.tipo ?? '',
    tamanho: dado?.tamanho ?? '',
    mascara: dado?.mascara ?? '',
    dominio: dado?.dominio ?? '',
    estadoPreenchimento: dado?.estadoPreenchimento ?? 'Obrigatorio',
    condicao: dado?.condicao ?? '',
    exemplo: dado?.exemplo ?? '',
    notaPreenchimento: dado?.notaPreenchimento ?? '',
    destinoXml: dado?.destinoXml ?? '',
    notaTransformacao: dado?.notaTransformacao ?? '',
    ordem: dado?.ordem ?? 0,
  }
}

export function CampoVersaoForm({
  initialData,
  opcoesCampoLayout,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
}: CampoVersaoFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampoVersaoFormValores>({
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF só alcança campo com
    // `ref` e correria com o nosso, vencendo ora um ora outro conforme o agendamento.
    shouldFocusError: false,
    resolver: zodResolver(campoVersaoSchema),
    defaultValues: valoresIniciais(initialData),
  })

  const estadoAtual = watch('estadoPreenchimento')
  const campoLayoutIdAtual = watch('campoLayoutId')

  const opcoesSelect: SelectOption[] = opcoesCampoLayout.map((opcao) => ({
    value: String(opcao.id),
    label: `${opcao.nome} (${opcao.caminhoXml})`,
  }))

  function aoSubmeter(valores: CampoVersaoFormValores) {
    const dto: CriarCampoVersaoDto = {
      campoLayoutId: Number(valores.campoLayoutId),
      tipo: valores.tipo,
      tamanho: valores.tamanho || undefined,
      mascara: valores.mascara || undefined,
      dominio: valores.dominio || undefined,
      estadoPreenchimento: valores.estadoPreenchimento,
      condicao: valores.condicao || undefined,
      exemplo: valores.exemplo || undefined,
      notaPreenchimento: valores.notaPreenchimento || undefined,
      destinoXml: valores.destinoXml || undefined,
      notaTransformacao: valores.notaTransformacao || undefined,
      ordem: valores.ordem,
    }
    onSubmit(dto)
  }

  return (
    <form
      onSubmit={handleSubmit(aoSubmeter, focarPrimeiroCampoInvalido)}
      className="flex flex-col gap-5"
      noValidate
    >
      {erroServidor && (
        <p role="alert" className="text-sm text-error-texto">
          {erroServidor}
        </p>
      )}

      <Select
        label="Campo canônico"
        required
        options={opcoesSelect}
        value={campoLayoutIdAtual || null}
        onValueChange={(valor) => setValue('campoLayoutId', valor, { shouldValidate: true })}
        error={errors.campoLayoutId?.message}
        placeholder="Selecione o campo do Layout InvoiCy"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input label="Tipo" required error={errors.tipo?.message} {...register('tipo')} />
        <Input label="Tamanho" error={errors.tamanho?.message} {...register('tamanho')} />
        <Input label="Máscara" error={errors.mascara?.message} {...register('mascara')} />
        <Input label="Valores aceitos" error={errors.dominio?.message} {...register('dominio')} />
      </div>

      <Select
        label="Estado de preenchimento"
        required
        options={ESTADOS_OPTIONS}
        value={estadoAtual}
        onValueChange={(valor) =>
          setValue('estadoPreenchimento', valor as EstadoPreenchimentoCampo, {
            shouldValidate: true,
          })
        }
        error={errors.estadoPreenchimento?.message}
      />

      {estadoAtual === 'Condicional' && (
        <Textarea
          label="Condição"
          required
          rows={2}
          error={errors.condicao?.message}
          {...register('condicao')}
        />
      )}

      <Input label="Exemplo" error={errors.exemplo?.message} {...register('exemplo')} />
      <Textarea
        label="Nota de preenchimento"
        rows={3}
        error={errors.notaPreenchimento?.message}
        {...register('notaPreenchimento')}
      />
      <Input
        label="Destino no XML"
        error={errors.destinoXml?.message}
        {...register('destinoXml')}
      />
      <Textarea
        label="Nota de transformação"
        rows={3}
        error={errors.notaTransformacao?.message}
        {...register('notaTransformacao')}
      />
      <Input
        label="Ordem"
        type="number"
        required
        error={errors.ordem?.message}
        {...register('ordem', { valueAsNumber: true })}
      />

      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
