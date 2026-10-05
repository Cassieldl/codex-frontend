import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { z } from 'zod'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import type { CampoLayoutAdmin, EstadoCampoLayout } from '../types/campoLayoutAdmin'

const ESTADO_OPTIONS: SelectOption[] = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Descontinuado', label: 'Descontinuado' },
]

// R3 (`analise-backend.md` §5.1a) — campo canônico é identidade, nunca
// comportamento. Este formulário nunca oferece tipo/tamanho/máscara/domínio/
// obrigatoriedade — isso vive só em `CampoVersaoForm`.
// Os tetos são os do backend (`LimitesCampoLayout`), que são os das colunas.
function criarSchema(modo: 'criar' | 'editar') {
  return z
    .object({
      nome: z.string().min(1, 'O nome é obrigatório.').max(120, 'Máximo de 120 caracteres.'),
      caminhoXml: z
        .string()
        .max(160, 'Máximo de 160 caracteres.')
        .optional()
        .or(z.literal(''))
        .refine((valor) => modo !== 'criar' || Boolean(valor?.trim()), {
          message: 'O caminho no XML é obrigatório.',
        }),
      significado: z
        .string()
        .min(1, 'O significado é obrigatório.')
        .max(1000, 'Máximo de 1000 caracteres.'),
      grupo: z.string().max(120, 'Máximo de 120 caracteres.').optional().or(z.literal('')),
      ordem: z
        .number('A ordem precisa ser um número.')
        .int('A ordem precisa ser um número inteiro.')
        .min(0, 'A ordem não pode ser negativa.'),
      estado: z.enum(['Ativo', 'Descontinuado'] as const).optional(),
      versaoLayoutDescontinuadoId: z.string().optional(),
    })
    .superRefine((valores, ctx) => {
      if (modo !== 'editar') return

      const descontinuado = valores.estado === 'Descontinuado'
      if (descontinuado && !valores.versaoLayoutDescontinuadoId) {
        ctx.addIssue({
          code: 'custom',
          path: ['versaoLayoutDescontinuadoId'],
          message: 'Selecione a versão de descontinuação quando o estado é Descontinuado.',
        })
      }
    })
}

type CampoLayoutFormValores = z.infer<ReturnType<typeof criarSchema>>

export interface CampoLayoutFormDto {
  nome: string
  caminhoXml?: string
  significado: string
  grupo?: string
  ordem: number
  estado?: EstadoCampoLayout
  versaoLayoutDescontinuadoId?: number
}

export interface CampoLayoutFormProps {
  modo: 'criar' | 'editar'
  initialData?: CampoLayoutAdmin
  /** Só relevante em `modo="editar"` — versões do layout posteriores à de origem deste campo. */
  opcoesVersaoLayoutDescontinuar?: SelectOption[]
  onSubmit: (dto: CampoLayoutFormDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
}

function valoresIniciais(dado?: CampoLayoutAdmin): CampoLayoutFormValores {
  return {
    nome: dado?.nome ?? '',
    caminhoXml: dado?.caminhoXml ?? '',
    significado: dado?.significado ?? '',
    grupo: dado?.grupo ?? '',
    ordem: dado?.ordem ?? 0,
    estado: dado?.estado ?? 'Ativo',
    versaoLayoutDescontinuadoId: dado?.versaoLayoutDescontinuadoId
      ? String(dado.versaoLayoutDescontinuadoId)
      : '',
  }
}

export function CampoLayoutForm({
  modo,
  initialData,
  opcoesVersaoLayoutDescontinuar = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
}: CampoLayoutFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampoLayoutFormValores>({
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF só alcança campo com
    // `ref` e correria com o nosso, vencendo ora um ora outro conforme o agendamento.
    shouldFocusError: false,
    resolver: zodResolver(criarSchema(modo)),
    defaultValues: valoresIniciais(initialData),
  })

  const estadoAtual = watch('estado')
  const versaoDescontinuadoAtual = watch('versaoLayoutDescontinuadoId')

  function aoSubmeter(valores: CampoLayoutFormValores) {
    onSubmit({
      nome: valores.nome,
      caminhoXml: modo === 'criar' ? valores.caminhoXml : undefined,
      significado: valores.significado,
      grupo: valores.grupo || undefined,
      ordem: valores.ordem,
      estado: modo === 'editar' ? valores.estado : undefined,
      versaoLayoutDescontinuadoId:
        modo === 'editar' &&
        valores.estado === 'Descontinuado' &&
        valores.versaoLayoutDescontinuadoId
          ? Number(valores.versaoLayoutDescontinuadoId)
          : undefined,
    })
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

      <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />

      {modo === 'criar' && (
        <Input
          label="Caminho no XML"
          required
          error={errors.caminhoXml?.message}
          {...register('caminhoXml')}
        />
      )}

      <Textarea
        label="Significado"
        required
        rows={3}
        error={errors.significado?.message}
        {...register('significado')}
      />

      <Input label="Grupo" error={errors.grupo?.message} {...register('grupo')} />
      <Input
        label="Ordem"
        type="number"
        required
        error={errors.ordem?.message}
        {...register('ordem', { valueAsNumber: true })}
      />

      {modo === 'editar' && (
        <>
          <Select
            label="Estado"
            required
            options={ESTADO_OPTIONS}
            value={estadoAtual ?? 'Ativo'}
            onValueChange={(valor) =>
              setValue('estado', valor as EstadoCampoLayout, { shouldValidate: true })
            }
            error={errors.estado?.message}
          />

          {estadoAtual === 'Descontinuado' && (
            <Select
              label="Versão de descontinuação"
              required
              options={opcoesVersaoLayoutDescontinuar}
              value={versaoDescontinuadoAtual || null}
              onValueChange={(valor) =>
                setValue('versaoLayoutDescontinuadoId', valor, { shouldValidate: true })
              }
              error={errors.versaoLayoutDescontinuadoId?.message}
              hint="Precisa ser posterior à versão de origem deste campo."
            />
          )}
        </>
      )}

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
