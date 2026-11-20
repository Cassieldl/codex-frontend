import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import type { ErroDeCampoApi } from '../../../../utils/handleApiError'
import { useErrosDeCampoDoServidor } from '../../utils/useErrosDeCampoDoServidor'
import { useForm } from 'react-hook-form'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { z } from 'zod'
import { ErroDoServidor } from '../../../../components/ui/ErroDoServidor'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import { useVersoesProvedorAdmin } from '../../provedores/hooks/useVersoesProvedorAdmin'
import type {
  AbrangenciaComunicado,
  ComunicadoAdminDetalhe,
  ComunicadoFormDto,
  SeveridadeComunicado,
} from '../types/comunicadoAdmin'

const SEVERIDADE_OPTIONS: SelectOption[] = [
  { value: 'Critico', label: 'Crítico' },
  { value: 'Alerta', label: 'Alerta' },
  { value: 'Informativo', label: 'Informativo' },
]

const ABRANGENCIA_OPTIONS: SelectOption[] = [
  { value: 'Global', label: 'Todo o portal' },
  { value: 'Provedor', label: 'Um provedor inteiro' },
  { value: 'ProvedorVersao', label: 'Uma versão de um provedor' },
]

/** Limite de `Comunicado.Corpo` no backend (decisoes.md B-6) - os dois lados concordam. */
const LIMITE_CORPO = 2000

// A abrangência determina a própria estrutura do formulário (mesmo princípio de
// `AvisoForm`): os campos de escopo nem são renderizados fora da abrangência que
// os exige, em vez de ficarem desabilitados. `superRefine` fecha o contrato no
// submit, espelhando `ck_codex_comunicados_abrangencia_consistente`.
const comunicadoSchema = z
  .object({
    titulo: z.string().min(1, 'O título é obrigatório.').max(200, 'Máximo de 200 caracteres.'),
    corpo: z
      .string()
      .min(1, 'O corpo do comunicado é obrigatório.')
      .max(LIMITE_CORPO, `Máximo de ${LIMITE_CORPO} caracteres.`),
    severidade: z.enum(['Critico', 'Alerta', 'Informativo'] as const, {
      error: 'Selecione a severidade.',
    }),
    abrangencia: z.enum(['Global', 'Provedor', 'ProvedorVersao'] as const, {
      error: 'Selecione a abrangência.',
    }),
    provedorId: z.string(),
    versaoProvedorId: z.string(),
    expiraEm: z
      .string()
      .min(1, 'A data de expiração é obrigatória.')
      .refine(
        (valor) => Number.isFinite(new Date(valor).getTime()),
        'Informe uma data e hora válidas.',
      )
      .refine(
        (valor) => new Date(valor).getTime() > Date.now(),
        'A expiração precisa ser no futuro.',
      ),
  })
  .superRefine((valores, ctx) => {
    if (valores.abrangencia !== 'Global' && !valores.provedorId) {
      ctx.addIssue({ code: 'custom', path: ['provedorId'], message: 'Selecione o provedor.' })
    }
    if (valores.abrangencia === 'ProvedorVersao' && !valores.versaoProvedorId) {
      ctx.addIssue({ code: 'custom', path: ['versaoProvedorId'], message: 'Selecione a versão.' })
    }
  })

type ComunicadoFormValores = z.infer<typeof comunicadoSchema>

export interface OpcaoProvedorComunicado {
  id: number
  nome: string
}

const CAMPOS_DO_FORMULARIO = [
  'titulo',
  'corpo',
  'severidade',
  'abrangencia',
  'provedorId',
  'versaoProvedorId',
  'expiraEm',
] as const satisfies readonly (keyof ComunicadoFormValores)[]

export interface ComunicadoFormProps {
  initialData?: ComunicadoAdminDetalhe
  opcoesProvedores: OpcaoProvedorComunicado[]
  onSubmit: (dto: ComunicadoFormDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
  /** Erros por campo do 422 - destacam o campo em vez de deixar só a mensagem geral. */
  errosDeCampo?: ErroDeCampoApi[]
}

/**
 * Converte o `expiraEm` do contrato (ISO-8601 com offset) para o formato que o
 * `<input type="datetime-local">` aceita, no fuso do editor. Data inválida ou
 * ausente vira campo vazio - nunca `Invalid Date` visível na tela.
 */
function paraCampoDataHora(iso: string | undefined): string {
  if (!iso) return ''
  const data = new Date(iso)
  if (!Number.isFinite(data.getTime())) return ''
  return format(data, "yyyy-MM-dd'T'HH:mm")
}

function valoresIniciais(dado?: ComunicadoAdminDetalhe): ComunicadoFormValores {
  return {
    titulo: dado?.titulo ?? '',
    corpo: dado?.corpo ?? '',
    severidade: dado?.severidade ?? 'Informativo',
    abrangencia: dado?.abrangencia ?? 'Global',
    provedorId: dado?.provedorId ? String(dado.provedorId) : '',
    versaoProvedorId: dado?.versaoProvedorId ? String(dado.versaoProvedorId) : '',
    expiraEm: paraCampoDataHora(dado?.expiraEm),
  }
}

export function ComunicadoForm({
  initialData,
  opcoesProvedores,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
  errosDeCampo,
}: ComunicadoFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ComunicadoFormValores>({
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF só alcança campo com
    // `ref` e correria com o nosso, vencendo ora um ora outro conforme o agendamento.
    shouldFocusError: false,
    resolver: zodResolver(comunicadoSchema),
    defaultValues: valoresIniciais(initialData),
  })

  useErrosDeCampoDoServidor(setError, CAMPOS_DO_FORMULARIO, errosDeCampo)

  const severidadeAtual = watch('severidade')
  const abrangenciaAtual = watch('abrangencia')
  const provedorAtual = watch('provedorId')
  const versaoAtual = watch('versaoProvedorId')
  const corpoAtual = watch('corpo')

  const exigeProvedor = abrangenciaAtual !== 'Global'
  const exigeVersao = abrangenciaAtual === 'ProvedorVersao'

  const { data: versoes } = useVersoesProvedorAdmin(exigeVersao ? Number(provedorAtual) : 0)

  const opcoesProvedorSelect: SelectOption[] = opcoesProvedores.map((provedor) => ({
    value: String(provedor.id),
    label: provedor.nome,
  }))

  const opcoesVersaoSelect: SelectOption[] = (versoes ?? []).map((versao) => ({
    value: String(versao.id),
    label: versao.rotulo,
  }))

  function aoTrocarAbrangencia(valor: string) {
    setValue('abrangencia', valor as AbrangenciaComunicado, { shouldValidate: true })

    // Voltar para uma abrangência mais larga descarta o escopo que ela não
    // comporta - o CHECK de consistência do banco recusaria a sobra.
    if (valor === 'Global') {
      setValue('provedorId', '')
    }
    if (valor !== 'ProvedorVersao') {
      setValue('versaoProvedorId', '')
    }
  }

  function aoTrocarProvedor(valor: string) {
    setValue('provedorId', valor, { shouldValidate: true })
    // A versão pertence ao provedor anterior: mantê-la submeteria uma
    // combinação provedor/versão que não existe.
    setValue('versaoProvedorId', '')
  }

  function aoSubmeter(valores: ComunicadoFormValores) {
    onSubmit({
      titulo: valores.titulo,
      corpo: valores.corpo,
      severidade: valores.severidade,
      abrangencia: valores.abrangencia,
      provedorId: valores.abrangencia !== 'Global' ? Number(valores.provedorId) : undefined,
      versaoProvedorId:
        valores.abrangencia === 'ProvedorVersao' ? Number(valores.versaoProvedorId) : undefined,
      expiraEm: new Date(valores.expiraEm).toISOString(),
    })
  }

  return (
    <form
      onSubmit={handleSubmit(aoSubmeter, focarPrimeiroCampoInvalido)}
      className="flex flex-col gap-5"
      noValidate
    >
      <ErroDoServidor mensagem={erroServidor} />

      <Input label="Título" required error={errors.titulo?.message} {...register('titulo')} />

      <Textarea
        label="Corpo"
        required
        rows={4}
        hint={`Texto curto, sem formatação: ${corpoAtual.length} de ${LIMITE_CORPO} caracteres.`}
        error={errors.corpo?.message}
        {...register('corpo')}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Severidade"
          required
          options={SEVERIDADE_OPTIONS}
          value={severidadeAtual}
          onValueChange={(valor) =>
            setValue('severidade', valor as SeveridadeComunicado, { shouldValidate: true })
          }
          error={errors.severidade?.message}
        />

        <Input
          label="Expira em"
          type="datetime-local"
          required
          hint="Comunicado sempre tem prazo: depois dele, sai do ar sozinho."
          error={errors.expiraEm?.message}
          {...register('expiraEm')}
        />
      </div>

      <fieldset className="flex flex-col gap-5">
        {/*
          Sem asterisco: todo campo deste grupo tem label e marca própria de obrigatoriedade, então
          a marca na legend era a segunda para o mesmo campo - a tela mostrava "* Onde o comunicado
          aparece" e "* Abrangência" empilhados, lidos como dois rótulos do mesmo select. Difere de
          `ErroForm`, onde a legend marca um grupo que é exigido como um todo e não tem label filho.
        */}
        <legend className="mb-1 text-xs font-semibold text-ink lg:text-sm">
          Onde o comunicado aparece
        </legend>

        <Select
          label="Abrangência"
          required
          options={ABRANGENCIA_OPTIONS}
          value={abrangenciaAtual}
          onValueChange={aoTrocarAbrangencia}
          error={errors.abrangencia?.message}
        />

        {exigeProvedor && (
          <Select
            label="Provedor"
            required
            options={opcoesProvedorSelect}
            value={provedorAtual || null}
            onValueChange={aoTrocarProvedor}
            error={errors.provedorId?.message}
          />
        )}

        {exigeVersao && (
          <Select
            label="Versão"
            required
            options={opcoesVersaoSelect}
            value={versaoAtual || null}
            placeholder={provedorAtual ? 'Selecione…' : 'Selecione o provedor primeiro'}
            disabled={!provedorAtual}
            error={errors.versaoProvedorId?.message}
            onValueChange={(valor) => setValue('versaoProvedorId', valor, { shouldValidate: true })}
          />
        )}
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
