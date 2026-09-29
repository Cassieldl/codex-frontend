import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { z } from 'zod'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import type { EstadoVersaoLayout, VersaoLayoutAdmin } from '../types/versaoLayoutAdmin'

// Os três estados são exatamente o enum `EstadoVersaoLayout` do backend
// (I15c aceita a transição; 422 quando ela é inválida). O rótulo é o próprio
// valor porque o vocabulário editorial e o do banco são o mesmo aqui.
const ESTADO_OPTIONS: SelectOption[] = [
  { value: 'Prevista', label: 'Prevista' },
  { value: 'Vigente', label: 'Vigente' },
  { value: 'Anterior', label: 'Anterior' },
]

const ESTADO_PADRAO: EstadoVersaoLayout = 'Prevista'

// `estado` só existe na edição: `CriarVersaoLayoutDto` (I15b) não aceita o
// campo — versão nasce sempre `Prevista` por conta do backend.
const versaoLayoutSchema = z.object({
  rotulo: z.string().min(1, 'O rótulo é obrigatório.').max(100, 'Máximo de 100 caracteres.'),
  descricao: z.string().max(2000, 'Máximo de 2000 caracteres.').optional().or(z.literal('')),
  estado: z.enum(['Prevista', 'Vigente', 'Anterior'] as const).optional(),
})

type VersaoLayoutFormValores = z.infer<typeof versaoLayoutSchema>

export interface VersaoLayoutFormDto {
  rotulo: string
  descricao?: string
  estado?: EstadoVersaoLayout
}

export interface VersaoLayoutFormProps {
  modo: 'criar' | 'editar'
  initialData?: VersaoLayoutAdmin
  onSubmit: (dto: VersaoLayoutFormDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
}

export function VersaoLayoutForm({
  modo,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
}: VersaoLayoutFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VersaoLayoutFormValores>({
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF só alcança campo com
    // `ref` e correria com o nosso, vencendo ora um ora outro conforme o agendamento.
    shouldFocusError: false,
    resolver: zodResolver(versaoLayoutSchema),
    defaultValues: {
      rotulo: initialData?.rotulo ?? '',
      descricao: initialData?.descricao ?? '',
      estado: initialData?.estado ?? ESTADO_PADRAO,
    },
  })

  const estadoAtual = watch('estado')

  function aoSubmeter(valores: VersaoLayoutFormValores) {
    onSubmit({
      rotulo: valores.rotulo,
      descricao: valores.descricao || undefined,
      estado: modo === 'editar' ? valores.estado : undefined,
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

      <Input label="Rótulo" required error={errors.rotulo?.message} {...register('rotulo')} />

      <Textarea
        label="Descrição"
        rows={3}
        error={errors.descricao?.message}
        {...register('descricao')}
      />

      {modo === 'editar' && (
        <Select
          label="Estado"
          required
          options={ESTADO_OPTIONS}
          value={estadoAtual ?? ESTADO_PADRAO}
          onValueChange={(valor) =>
            setValue('estado', valor as EstadoVersaoLayout, { shouldValidate: true })
          }
          error={errors.estado?.message}
          hint="Vigente é a versão em uso; Anterior é a que saiu de vigência."
        />
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
