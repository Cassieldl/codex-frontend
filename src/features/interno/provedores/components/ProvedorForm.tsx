import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { z } from 'zod'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import type { CategoriaProvedor, ProvedorAdminDetalhe } from '../types/provedorAdmin'

const CATEGORIA_OPTIONS: SelectOption[] = [
  { value: 'Nacional', label: 'Nacional' },
  { value: 'Proprio', label: 'Próprio' },
]

const provedorSchema = z.object({
  nome: z.string().min(1, 'O nome é obrigatório.').max(200, 'Máximo de 200 caracteres.'),
  identificadorInvoicy: z
    .string()
    .min(1, 'O identificador InvoiCy é obrigatório.')
    .max(100, 'Máximo de 100 caracteres.'),
  categoria: z.enum(['Nacional', 'Proprio'] as const, { error: 'Selecione a categoria.' }),
  aliasesTexto: z.string().max(2000, 'Máximo de 2000 caracteres.').optional().or(z.literal('')),
})

type ProvedorFormValores = z.infer<typeof provedorSchema>

export interface ProvedorFormDto {
  nome: string
  identificadorInvoicy?: string
  categoria: CategoriaProvedor
  aliases: string[]
}

export interface ProvedorFormProps {
  initialData?: ProvedorAdminDetalhe
  /** Só aparece na criação — I4 (`AtualizarProvedorDto`) não tem este campo. */
  permiteEditarIdentificador?: boolean
  onSubmit: (dto: ProvedorFormDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
}

function valoresIniciais(dado?: ProvedorAdminDetalhe): ProvedorFormValores {
  return {
    nome: dado?.nome ?? '',
    identificadorInvoicy: dado?.identificadorInvoicy ?? '',
    categoria: dado?.categoria ?? 'Nacional',
    aliasesTexto: dado?.aliases.join('\n') ?? '',
  }
}

export function ProvedorForm({
  initialData,
  permiteEditarIdentificador = true,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
}: ProvedorFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProvedorFormValores>({
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF só alcança campo com
    // `ref` e correria com o nosso, vencendo ora um ora outro conforme o agendamento.
    shouldFocusError: false,
    resolver: zodResolver(provedorSchema),
    defaultValues: valoresIniciais(initialData),
  })

  const categoriaAtual = watch('categoria')

  function aoSubmeter(valores: ProvedorFormValores) {
    onSubmit({
      nome: valores.nome,
      identificadorInvoicy: permiteEditarIdentificador ? valores.identificadorInvoicy : undefined,
      categoria: valores.categoria,
      aliases: (valores.aliasesTexto ?? '')
        .split('\n')
        .map((alias) => alias.trim())
        .filter(Boolean),
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

      {permiteEditarIdentificador && (
        <Input
          label="Identificador InvoiCy"
          required
          error={errors.identificadorInvoicy?.message}
          {...register('identificadorInvoicy')}
        />
      )}

      <Select
        label="Categoria"
        required
        options={CATEGORIA_OPTIONS}
        value={categoriaAtual}
        onValueChange={(valor) =>
          setValue('categoria', valor as CategoriaProvedor, { shouldValidate: true })
        }
        error={errors.categoria?.message}
      />

      <Textarea
        label="Aliases"
        hint="Um por linha — outros nomes pelos quais este provedor é conhecido."
        rows={3}
        error={errors.aliasesTexto?.message}
        {...register('aliasesTexto')}
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
