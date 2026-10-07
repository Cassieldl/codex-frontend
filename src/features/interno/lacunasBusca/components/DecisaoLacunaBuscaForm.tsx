import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../../../components/ui/Button'
import { Textarea } from '../../../../components/ui/Textarea'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import {
  decisaoLacunaBuscaSchema,
  type DecisaoLacunaBuscaValores,
} from '../types/decisaoLacunaBuscaSchema'

export interface DecisaoLacunaBuscaFormProps {
  /** Verbo do botão de confirmação: "Resolver" ou "Descartar". */
  rotuloConfirmacao: string
  dicaDaNota: string
  onSubmit: (valores: DecisaoLacunaBuscaValores) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
}

/** Nota opcional da decisão sobre um termo da fila editorial. */
export function DecisaoLacunaBuscaForm({
  rotuloConfirmacao,
  dicaDaNota,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
}: DecisaoLacunaBuscaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DecisaoLacunaBuscaValores>({
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF correria com ele.
    shouldFocusError: false,
    resolver: zodResolver(decisaoLacunaBuscaSchema),
    defaultValues: { nota: '' },
  })

  return (
    <form
      onSubmit={handleSubmit(onSubmit, focarPrimeiroCampoInvalido)}
      className="flex flex-col gap-5"
      noValidate
    >
      {erroServidor && (
        <p role="alert" className="text-sm text-error-texto">
          {erroServidor}
        </p>
      )}

      <Textarea
        label="Nota (opcional)"
        rows={3}
        hint={dicaDaNota}
        error={errors.nota?.message}
        {...register('nota')}
      />

      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          {rotuloConfirmacao}
        </Button>
      </div>
    </form>
  )
}
