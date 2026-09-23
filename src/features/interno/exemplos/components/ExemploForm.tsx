import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Textarea } from '../../../../components/ui/Textarea'
import type { CriarExemploDto, ExemploAdmin } from '../types/exemploAdmin'

/**
 * Teto de negócio do XML (C3), medido em **caracteres** — exatamente como o
 * `CriarExemploDtoValidator` do backend, que compara `xml.Length` de uma string
 * .NET (UTF-16).
 *
 * Não confundir com o `CHECK` `ck_codex_exemplos_xml_tamanho` do banco, que é de
 * 256 KiB em **bytes** UTF-8 e existe como guarda de catástrofe. As duas unidades
 * são deliberadamente diferentes: medir bytes aqui reprovaria no cliente um XML
 * acentuado que o servidor aceita.
 */
export const TAMANHO_MAXIMO_XML_CARACTERES = 64 * 1024

/** O slug do exemplo é derivado do nome — nome sem letra nem dígito normalizaria para vazio. */
const NOME_COM_LETRA_OU_DIGITO = /[a-zA-Z0-9]/

const LIMITE_DESCRICAO = 500

const exemploSchema = z.object({
  nome: z
    .string()
    .min(1, 'O nome do exemplo é obrigatório.')
    .max(160, 'Máximo de 160 caracteres.')
    .refine(
      (valor) => NOME_COM_LETRA_OU_DIGITO.test(valor),
      'O nome precisa conter ao menos uma letra ou número.',
    ),
  descricao: z
    .string()
    .max(LIMITE_DESCRICAO, `Máximo de ${LIMITE_DESCRICAO} caracteres.`)
    .optional()
    .or(z.literal('')),
  xml: z
    .string()
    .min(1, 'O XML do exemplo é obrigatório.')
    .max(
      TAMANHO_MAXIMO_XML_CARACTERES,
      `O XML deve ter no máximo ${TAMANHO_MAXIMO_XML_CARACTERES} caracteres.`,
    ),
})

type ExemploFormValores = z.infer<typeof exemploSchema>

export interface ExemploFormProps {
  initialData?: ExemploAdmin
  onSubmit: (dto: CriarExemploDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
}

function valoresIniciais(dado?: ExemploAdmin): ExemploFormValores {
  return {
    nome: dado?.nome ?? '',
    descricao: dado?.descricao ?? '',
    xml: dado?.xml ?? '',
  }
}

/**
 * Formulário de exemplo (I39/I41). Burro: recebe `onSubmit` e não conhece
 * mutation nenhuma — quem orquestra é `SecaoExemplosVersao`.
 *
 * Sem campo de slug: na criação ele é derivado do nome pelo backend, e na edição
 * não muda nunca (renomear não recalcula slug). Oferecê-lo aqui prometeria um
 * controle que o contrato não dá.
 */
export function ExemploForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
}: ExemploFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExemploFormValores>({
    resolver: zodResolver(exemploSchema),
    defaultValues: valoresIniciais(initialData),
  })

  function aoSubmeter(valores: ExemploFormValores) {
    onSubmit({
      nome: valores.nome,
      descricao: valores.descricao || undefined,
      xml: valores.xml,
    })
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-5" noValidate>
      {erroServidor && (
        <p role="alert" className="text-sm text-error-texto">
          {erroServidor}
        </p>
      )}

      {initialData && (
        <p className="text-xs text-muted">
          Endereço do exemplo: <code className="font-mono">#exemplo-{initialData.slug}</code> — não
          muda ao renomear, para não quebrar links já compartilhados.
        </p>
      )}

      <Input label="Nome do cenário" required error={errors.nome?.message} {...register('nome')} />

      <Textarea
        label="Resumo"
        rows={2}
        hint="Uma linha sobre o que este cenário cobre."
        error={errors.descricao?.message}
        {...register('descricao')}
      />

      <Textarea
        label="XML"
        required
        rows={12}
        className="font-mono"
        error={errors.xml?.message}
        {...register('xml')}
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
