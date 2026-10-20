import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { z } from 'zod'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import type { ErroAdminDetalhe, ErroFormDto, OrigemErro } from '../types/erroAdmin'

const ORIGEM_OPTIONS: SelectOption[] = [
  { value: 'Prefeitura', label: 'Prefeitura' },
  { value: 'InvoiCy', label: 'InvoiCy' },
  { value: 'Schema', label: 'Schema' },
]

const MENSAGEM_VERSOES_OBRIGATORIAS =
  'Erros de prefeitura precisam de ao menos um provedor/versão aplicável.'

// U9 (`analise-backend.md` §5.1d) — espelha `CriarErroDtoValidator`/
// `AtualizarErroDtoValidator`: `versoesProvedorIds` obrigatório só quando a
// origem é Prefeitura. Roda no submit (`superRefine`), nunca a cada tecla —
// trocar a origem de Prefeitura para InvoiCy/Schema com o campo vazio não
// dispara erro retroativo.
const erroSchema = z
  .object({
    codigo: z.string().min(1, 'O código é obrigatório.').max(40, 'Máximo de 40 caracteres.'),
    origem: z.enum(['Prefeitura', 'InvoiCy', 'Schema'] as const, {
      error: 'Selecione a origem.',
    }),
    titulo: z.string().min(1, 'O título é obrigatório.').max(200, 'Máximo de 200 caracteres.'),
    causaProvavel: z.string().max(2000, 'Máximo de 2000 caracteres.').optional().or(z.literal('')),
    solucaoSugerida: z
      .string()
      .max(4000, 'Máximo de 4000 caracteres.')
      .optional()
      .or(z.literal('')),
    variantes: z
      .array(
        z.object({
          texto: z
            .string()
            .min(1, 'A variante não pode ficar vazia.')
            .max(1000, 'Máximo de 1000 caracteres.'),
        }),
      )
      .min(1, 'Cadastre ao menos uma variante de mensagem.'),
    versoesProvedorIds: z.array(z.string()),
    camposLayoutIds: z.array(z.string()),
  })
  .superRefine((valores, ctx) => {
    if (valores.origem === 'Prefeitura' && valores.versoesProvedorIds.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['versoesProvedorIds'],
        message: MENSAGEM_VERSOES_OBRIGATORIAS,
      })
    }
  })

type ErroFormValores = z.infer<typeof erroSchema>

export interface OpcaoVersaoProvedorErro {
  id: number
  rotulo: string
}

export interface OpcaoCampoLayoutErro {
  id: number
  rotulo: string
}

export interface ErroFormProps {
  initialData?: ErroAdminDetalhe
  opcoesVersoesProvedor: OpcaoVersaoProvedorErro[]
  opcoesCamposLayout: OpcaoCampoLayoutErro[]
  onSubmit: (dto: ErroFormDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
}

function valoresIniciais(dado?: ErroAdminDetalhe): ErroFormValores {
  return {
    codigo: dado?.codigo ?? '',
    origem: dado?.origem ?? 'Prefeitura',
    titulo: dado?.titulo ?? '',
    causaProvavel: dado?.causaProvavel ?? '',
    solucaoSugerida: dado?.solucaoSugerida ?? '',
    variantes: dado?.variantes.length
      ? dado.variantes.map((texto) => ({ texto }))
      : [{ texto: '' }],
    versoesProvedorIds: dado?.versoesProvedorIds.map(String) ?? [],
    camposLayoutIds: dado?.camposLayoutIds.map(String) ?? [],
  }
}

export function ErroForm({
  initialData,
  opcoesVersoesProvedor,
  opcoesCamposLayout,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
}: ErroFormProps) {
  const versoesCheckboxId = useId()
  const camposCheckboxId = useId()
  const isEdicao = initialData !== undefined

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ErroFormValores>({
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF só alcança campo com
    // `ref` e correria com o nosso, vencendo ora um ora outro conforme o agendamento.
    shouldFocusError: false,
    resolver: zodResolver(erroSchema),
    defaultValues: valoresIniciais(initialData),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'variantes' })

  const origemAtual = watch('origem')
  const versoesSelecionadas = watch('versoesProvedorIds')
  const camposSelecionados = watch('camposLayoutIds')

  function aoSubmeter(valores: ErroFormValores) {
    onSubmit({
      codigo: valores.codigo,
      origem: valores.origem,
      titulo: valores.titulo,
      causaProvavel: valores.causaProvavel || undefined,
      solucaoSugerida: valores.solucaoSugerida || undefined,
      variantes: valores.variantes.map((variante) => variante.texto),
      versoesProvedorIds: valores.versoesProvedorIds.map(Number),
      camposLayoutIds: valores.camposLayoutIds.map(Number),
    })
  }

  function alternarSelecao(campo: 'versoesProvedorIds' | 'camposLayoutIds', id: string) {
    const atual = campo === 'versoesProvedorIds' ? versoesSelecionadas : camposSelecionados
    const proximo = atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
    setValue(campo, proximo, { shouldValidate: true })
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Código"
          required
          readOnly={isEdicao}
          hint={isEdicao ? 'O código não muda depois de criado.' : undefined}
          error={errors.codigo?.message}
          {...register('codigo')}
        />
        <Select
          label="Origem"
          required
          options={ORIGEM_OPTIONS}
          value={origemAtual}
          onValueChange={(valor) =>
            setValue('origem', valor as OrigemErro, { shouldValidate: true })
          }
          error={errors.origem?.message}
        />
      </div>

      <Input label="Título" required error={errors.titulo?.message} {...register('titulo')} />

      <Textarea
        label="Causa provável"
        rows={3}
        error={errors.causaProvavel?.message}
        {...register('causaProvavel')}
      />
      <Textarea
        label="Solução sugerida"
        rows={4}
        error={errors.solucaoSugerida?.message}
        {...register('solucaoSugerida')}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-xs font-semibold text-ink lg:text-sm">
          <span aria-hidden="true" className="text-error-texto">
            *{' '}
          </span>
          Mensagens observadas (variantes)
        </legend>

        {errors.variantes?.root?.message && (
          <p className="text-xs text-error-texto">{errors.variantes.root.message}</p>
        )}

        {fields.map((field, indice) => (
          <div key={field.id} className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                label={`Variante ${indice + 1}`}
                error={errors.variantes?.[indice]?.texto?.message}
                {...register(`variantes.${indice}.texto` as const)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label={`Remover variante ${indice + 1}`}
              onClick={() => remove(indice)}
              disabled={fields.length <= 1}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="size-4" />}
          onClick={() => append({ texto: '' })}
          className="self-start"
        >
          Adicionar variante
        </Button>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-xs font-semibold text-ink lg:text-sm">
          {origemAtual === 'Prefeitura' && (
            <span aria-hidden="true" className="text-error-texto">
              *{' '}
            </span>
          )}
          Provedores e versões aplicáveis
        </legend>
        <p className="text-xs text-muted">
          {origemAtual === 'Prefeitura'
            ? 'Obrigatório para erros de origem Prefeitura.'
            : 'Opcional — deixe vazio se o erro é geral (vale para qualquer integração).'}
        </p>

        {errors.versoesProvedorIds?.message && (
          <p className="text-xs text-error-texto">{errors.versoesProvedorIds.message}</p>
        )}

        <div className="flex flex-col gap-1.5">
          {opcoesVersoesProvedor.map((opcao) => {
            const id = String(opcao.id)
            const inputId = `${versoesCheckboxId}-${id}`
            return (
              <label
                key={id}
                htmlFor={inputId}
                className="flex items-center gap-2 text-sm text-ink"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  className="size-4 rounded-[var(--radius-check)]"
                  checked={versoesSelecionadas.includes(id)}
                  onChange={() => alternarSelecao('versoesProvedorIds', id)}
                />
                {opcao.rotulo}
              </label>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-xs font-semibold text-ink lg:text-sm">
          Campos relacionados
        </legend>
        <div className="flex flex-col gap-1.5">
          {opcoesCamposLayout.map((opcao) => {
            const id = String(opcao.id)
            const inputId = `${camposCheckboxId}-${id}`
            return (
              <label
                key={id}
                htmlFor={inputId}
                className="flex items-center gap-2 text-sm text-ink"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  className="size-4 rounded-[var(--radius-check)]"
                  checked={camposSelecionados.includes(id)}
                  onChange={() => alternarSelecao('camposLayoutIds', id)}
                />
                {opcao.rotulo}
              </label>
            )
          })}
        </div>
      </fieldset>

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
