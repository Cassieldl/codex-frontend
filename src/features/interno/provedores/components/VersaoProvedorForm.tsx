import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { z } from 'zod'
import { ErroDoServidor } from '../../../../components/ui/ErroDoServidor'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import type { VersaoAdminDetalhe } from '../types/versaoAdmin'

const versaoSchema = z.object({
  versaoLayoutId: z.string().min(1, 'Selecione a versão do Layout InvoiCy.'),
  // 80 é o tamanho da coluna e o teto do validator do backend.
  rotulo: z.string().min(1, 'O rótulo é obrigatório.').max(80, 'Máximo de 80 caracteres.'),
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
  /**
   * Só aparece na criação. O PUT aceita trocar o layout, mas recusa com 422 se a versão já tiver
   * campos — e na edição ela quase sempre tem —, então a edição nunca envia `versaoLayoutId`.
   */
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
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF só alcança campo com
    // `ref` e correria com o nosso, vencendo ora um ora outro conforme o agendamento.
    shouldFocusError: false,
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
    <form
      onSubmit={handleSubmit(aoSubmeter, focarPrimeiroCampoInvalido)}
      className="flex flex-col gap-5"
      noValidate
    >
      <ErroDoServidor mensagem={erroServidor} />

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
