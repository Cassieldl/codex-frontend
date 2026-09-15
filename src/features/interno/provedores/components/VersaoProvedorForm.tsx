import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import type { VersaoAdminDetalhe } from '../types/versaoAdmin'

const versaoSchema = z.object({
  versaoLayoutId: z.string().min(1, 'Selecione a versão do Layout InvoiCy.'),
  rotulo: z.string().min(1, 'O rótulo é obrigatório.').max(100, 'Máximo de 100 caracteres.'),
  introducao: z.string().max(4000, 'Máximo de 4000 caracteres.').optional().or(z.literal('')),
})

type VersaoProvedorFormValores = z.infer<typeof versaoSchema>

export interface VersaoProvedorFormDto {
  versaoLayoutId?: number
  rotulo: string
  introducao?: string
}

export interface VersaoProvedorFormProps {
  initialData?: VersaoAdminDetalhe
  opcoesVersaoLayout: SelectOption[]
  /** Só aparece na criação — `AtualizarVersaoDto` (I8b) não tem `versaoLayoutId`. */
  permiteEscolherVersaoLayout?: boolean
  onSubmit: (dto: VersaoProvedorFormDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
}

function valoresIniciais(dado?: VersaoAdminDetalhe): VersaoProvedorFormValores {
  return {
    versaoLayoutId: dado ? String(dado.versaoLayoutId) : '',
    rotulo: dado?.rotulo ?? '',
    introducao: dado?.introducao ?? '',
  }
}

export function VersaoProvedorForm({
  initialData,
  opcoesVersaoLayout,
  permiteEscolherVersaoLayout = true,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
}: VersaoProvedorFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VersaoProvedorFormValores>({
    resolver: zodResolver(versaoSchema),
    defaultValues: valoresIniciais(initialData),
  })

  const versaoLayoutIdAtual = watch('versaoLayoutId')

  function aoSubmeter(valores: VersaoProvedorFormValores) {
    onSubmit({
      versaoLayoutId: permiteEscolherVersaoLayout ? Number(valores.versaoLayoutId) : undefined,
      rotulo: valores.rotulo,
      introducao: valores.introducao || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-5" noValidate>
      {erroServidor && (
        <p role="alert" className="text-sm text-error-texto">
          {erroServidor}
        </p>
      )}

      {permiteEscolherVersaoLayout && (
        <Select
          label="Versão do Layout InvoiCy"
          required
          options={opcoesVersaoLayout}
          value={versaoLayoutIdAtual || null}
          onValueChange={(valor) => setValue('versaoLayoutId', valor, { shouldValidate: true })}
          error={errors.versaoLayoutId?.message}
        />
      )}

      <Input label="Rótulo" required error={errors.rotulo?.message} {...register('rotulo')} />

      <Textarea
        label="Introdução"
        rows={4}
        error={errors.introducao?.message}
        {...register('introducao')}
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
