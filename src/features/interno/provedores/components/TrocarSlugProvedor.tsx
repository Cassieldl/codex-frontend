import { zodResolver } from '@hookform/resolvers/zod'
import { Link2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { focarPrimeiroCampoInvalido } from '../../utils/focarPrimeiroCampoInvalido'
import { z } from 'zod'
import { ErroDoServidor } from '../../../../components/ui/ErroDoServidor'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Modal } from '../../../../components/ui/Modal'
import { RodapeDoFormulario } from '../../../../components/ui/RodapeDoFormulario'
import { Toast } from '../../../../components/ui/Toast'
import { handleApiError } from '../../../../utils/handleApiError'
import { extrairCodigoDeErroApi } from '../../utils/codigoDeErroApi'
import { useTrocarSlugProvedor } from '../hooks/useTrocarSlugProvedor'
import { mensagemDeErroDeEscrita } from '../../utils/mensagemDeErroDeEscrita'

const DURACAO_TOAST_MS = 6000

/**
 * 409 de unicidade (o endereço já é de outra entidade). Distinguido de
 * `CONFLITO_CONCORRENCIA`, que também é 409 e chega do mesmo endpoint: um é erro
 * do valor digitado, o outro é "alguém salvou antes de você"; misturar os dois
 * marcaria o campo errado.
 */
const CODIGO_ENDERECO_JA_EXISTE = 'REGISTRO_DUPLICADO'

/**
 * Teto do `AlterarSlugDtoValidator` do backend: 160, o MENOR entre as três
 * entidades que compartilham o DTO (`provedores.slug` é `varchar(160)`). Não é
 * 180: um valor maior que 160 passaria aqui e voltaria 422 do servidor.
 */
const TAMANHO_MAXIMO_SLUG = 160

/** O backend deriva o slug e recusa o que normaliza para vazio (`Slug.PodeDerivarDe`). */
const SLUG_COM_LETRA_OU_DIGITO = /[a-z0-9]/

const trocarSlugSchema = z.object({
  novoSlug: z
    .string()
    .min(1, 'O novo endereço é obrigatório.')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen.')
    .refine(
      (valor) => SLUG_COM_LETRA_OU_DIGITO.test(valor),
      'O endereço precisa conter ao menos uma letra ou número.',
    )
    .max(TAMANHO_MAXIMO_SLUG, `Máximo de ${TAMANHO_MAXIMO_SLUG} caracteres.`),
})

type TrocarSlugValores = z.infer<typeof trocarSlugSchema>

export interface TrocarSlugProvedorProps {
  provedorId: number
  slugAtual: string
  etag?: string
}

/**
 * Troca o endereço público do provedor (I37, tela 13). "Endereço" e não "slug":
 * o vocabulário do produto fala de URL para quem lê, e o termo interno não
 * aparece na tela.
 *
 * É uma ação sobre uma URL já indexada e compartilhada, por isso a confirmação
 * tem duas camadas: o modal mostra o endereço atual e um aviso não dispensável
 * sobre o redirecionamento, em vez de um campo solto na página.
 */
export function TrocarSlugProvedor({ provedorId, slugAtual, etag }: TrocarSlugProvedorProps) {
  const [aberto, setAberto] = useState(false)
  const [erroServidor, setErroServidor] = useState<string | null>(null)
  const [avisoDeSucesso, setAvisoDeSucesso] = useState<string | null>(null)
  const timeoutDoAviso = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const trocarSlug = useTrocarSlugProvedor()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TrocarSlugValores>({
    // O foco de erro é nosso (`focarPrimeiroCampoInvalido`): o do RHF só alcança campo com
    // `ref` e correria com o nosso, vencendo ora um ora outro conforme o agendamento.
    shouldFocusError: false,
    resolver: zodResolver(trocarSlugSchema),
    defaultValues: { novoSlug: '' },
  })

  useEffect(() => {
    return () => {
      if (timeoutDoAviso.current) clearTimeout(timeoutDoAviso.current)
    }
  }, [])

  function abrir() {
    setErroServidor(null)
    reset({ novoSlug: '' })
    setAberto(true)
  }

  function aoSubmeter(valores: TrocarSlugValores) {
    setErroServidor(null)

    trocarSlug.mutate(
      { id: provedorId, slug: valores.novoSlug, etag },
      {
        onSuccess: (provedor) => {
          setAberto(false)
          setAvisoDeSucesso(
            `Endereço alterado para /provedores/${provedor.slug}. Os links com o endereço anterior continuam funcionando por redirecionamento automático.`,
          )
          if (timeoutDoAviso.current) clearTimeout(timeoutDoAviso.current)
          timeoutDoAviso.current = setTimeout(() => setAvisoDeSucesso(null), DURACAO_TOAST_MS)
        },
        onError: (erro) => {
          if (extrairCodigoDeErroApi(erro) === CODIGO_ENDERECO_JA_EXISTE) {
            setError('novoSlug', { type: 'server', message: handleApiError(erro) })
            return
          }
          setErroServidor(mensagemDeErroDeEscrita(erro))
        },
      },
    )
  }

  return (
    <>
      <Button variant="secondary" leftIcon={<Link2 className="size-4" />} onClick={abrir}>
        Trocar endereço
      </Button>

      <Modal
        isOpen={aberto}
        onClose={() => setAberto(false)}
        title="Trocar endereço do provedor"
        size="md"
      >
        <form
          onSubmit={handleSubmit(aoSubmeter, focarPrimeiroCampoInvalido)}
          className="flex flex-col gap-5"
          noValidate
        >
          <ErroDoServidor mensagem={erroServidor} />

          <div className="flex flex-col gap-0.5">
            <span className="mb-1 text-xs font-normal text-ink lg:text-sm">Endereço atual</span>
            <p className="rounded-[var(--radius-input)] border border-border bg-surface-disabled px-3 py-2 font-mono text-sm text-ink">
              /provedores/{slugAtual}
            </p>
          </div>

          <Input
            label="Novo endereço"
            required
            hint="Somente a parte final da URL: letras minúsculas, números e hífen."
            error={errors.novoSlug?.message}
            {...register('novoSlug')}
          />

          <p className="rounded-[var(--radius-aviso)] border border-alert-warning-borda bg-alert-warning px-3 py-2 text-xs text-ink">
            Todo link com o endereço atual (/provedores/{slugAtual}) continua funcionando e
            redireciona automaticamente para o novo, mas isso pode levar minutos para propagar em
            buscadores externos.
          </p>

          <RodapeDoFormulario>
            <Button
              variant="secondary"
              onClick={() => setAberto(false)}
              disabled={trocarSlug.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={trocarSlug.isPending} disabled={trocarSlug.isPending}>
              Confirmar troca
            </Button>
          </RodapeDoFormulario>
        </form>
      </Modal>

      {avisoDeSucesso && (
        <div className="fixed top-4 right-4 z-50 w-96">
          <Toast tone="success" message={avisoDeSucesso} onClose={() => setAvisoDeSucesso(null)} />
        </div>
      )}
    </>
  )
}
