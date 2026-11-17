import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { z } from 'zod'
import { ErroDoServidor } from '../../../../components/ui/ErroDoServidor'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import type {
  EstadoVersaoLayout,
  MarcosDaVersaoLayoutAdmin,
  MarcosDaVersaoLayoutEnvio,
  VersaoLayoutAdmin,
} from '../types/versaoLayoutAdmin'

// Os três estados são exatamente o enum `EstadoVersaoLayout` do backend
// (I15c aceita a transição; 422 quando ela é inválida). O rótulo é o próprio
// valor porque o vocabulário editorial e o do banco são o mesmo aqui.
const ESTADO_OPTIONS: SelectOption[] = [
  { value: 'Prevista', label: 'Prevista' },
  { value: 'Vigente', label: 'Vigente' },
  { value: 'Anterior', label: 'Anterior' },
]

const ESTADO_PADRAO: EstadoVersaoLayout = 'Prevista'

// O `<input type="date">` entrega `yyyy-MM-dd` ou vazio.
const dataOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
  .optional()
  .or(z.literal(''))

// `estado` só existe na edição: `CriarVersaoLayoutDto` (I15b) não aceita o
// campo, porque a versão nasce sempre `Prevista` por conta do backend.
const versaoLayoutSchema = z.object({
  rotulo: z.string().min(1, 'O rótulo é obrigatório.').max(80, 'Máximo de 80 caracteres.'),
  descricao: z.string().max(2000, 'Máximo de 2000 caracteres.').optional().or(z.literal('')),
  estado: z.enum(['Prevista', 'Vigente', 'Anterior'] as const).optional(),
  normaOrigem: z.string().max(60, 'Máximo de 60 caracteres.').optional().or(z.literal('')),
  homologacaoDesde: dataOpcional,
  liberadaNoInvoicyEm: dataOpcional,
  obrigatoriaEm: dataOpcional,
})

type VersaoLayoutFormValores = z.infer<typeof versaoLayoutSchema>

type CampoDeMarco = keyof MarcosDaVersaoLayoutAdmin

const CAMPOS_DE_MARCO: CampoDeMarco[] = [
  'normaOrigem',
  'homologacaoDesde',
  'liberadaNoInvoicyEm',
  'obrigatoriaEm',
]

export interface VersaoLayoutFormDto extends MarcosDaVersaoLayoutEnvio {
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
      normaOrigem: initialData?.normaOrigem ?? '',
      homologacaoDesde: initialData?.homologacaoDesde ?? '',
      liberadaNoInvoicyEm: initialData?.liberadaNoInvoicyEm ?? '',
      obrigatoriaEm: initialData?.obrigatoriaEm ?? '',
    },
  })

  const estadoAtual = watch('estado')

  // O backend lê descrição ausente como "permanece" e string vazia como "limpar".
  function descricaoParaEnvio(descricao: string | undefined): string | undefined {
    if (descricao) return descricao
    return modo === 'editar' && initialData?.descricao ? '' : undefined
  }

  // Na edição o PUT substitui os quatro marcos: vão sempre, e `null` apaga. Na criação, o vazio
  // não vai.
  function marcosParaEnvio(valores: VersaoLayoutFormValores): MarcosDaVersaoLayoutEnvio {
    const marcos: MarcosDaVersaoLayoutEnvio = {}

    for (const campo of CAMPOS_DE_MARCO) {
      const valor = valores[campo]?.trim()
      if (valor) marcos[campo] = valor
      else if (modo === 'editar') marcos[campo] = null
    }

    return marcos
  }

  function aoSubmeter(valores: VersaoLayoutFormValores) {
    onSubmit({
      rotulo: valores.rotulo,
      descricao: descricaoParaEnvio(valores.descricao),
      estado: modo === 'editar' ? valores.estado : undefined,
      ...marcosParaEnvio(valores),
    })
  }

  return (
    <form
      onSubmit={handleSubmit(aoSubmeter, focarPrimeiroCampoInvalido)}
      className="flex flex-col gap-5"
      noValidate
    >
      <ErroDoServidor mensagem={erroServidor} />

      <Input label="Rótulo" required error={errors.rotulo?.message} {...register('rotulo')} />

      <Textarea
        label="Descrição"
        rows={3}
        error={errors.descricao?.message}
        {...register('descricao')}
      />

      <Input
        label="Norma de origem"
        placeholder="NT 009 v1.01"
        hint="Nota técnica de onde a versão veio."
        error={errors.normaOrigem?.message}
        {...register('normaOrigem')}
      />

      {/* Rótulo de duas linhas ao lado de um de uma empurrava só parte dos inputs: alinha pelo pé. */}
      <div className="grid gap-5 sm:grid-cols-3 sm:items-end">
        <Input
          label="Homologação desde"
          type="date"
          className="w-full"
          error={errors.homologacaoDesde?.message}
          {...register('homologacaoDesde')}
        />
        <Input
          label="Liberada no InvoiCy em"
          type="date"
          className="w-full"
          error={errors.liberadaNoInvoicyEm?.message}
          {...register('liberadaNoInvoicyEm')}
        />
        <Input
          label="Obrigatória em"
          type="date"
          className="w-full"
          error={errors.obrigatoriaEm?.message}
          {...register('obrigatoriaEm')}
        />
      </div>

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
