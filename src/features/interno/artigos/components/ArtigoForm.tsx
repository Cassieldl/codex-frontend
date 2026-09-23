import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import type { ErroDeCampoApi } from '../../../../utils/handleApiError'
import { useErrosDeCampoDoServidor } from '../../utils/useErrosDeCampoDoServidor'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../../../components/ui/Button'
import { ConteudoArtigo } from '../../../../components/ui/ConteudoArtigo'
import { Input } from '../../../../components/ui/Input'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { Textarea } from '../../../../components/ui/Textarea'
import { ROTULO_TIPO_ARTIGO } from '../../../artigos/components/EtiquetaTipoArtigo'
import type { ArtigoAdminDetalhe, ArtigoFormDto, TipoArtigo } from '../types/artigoAdmin'
import { AbasFormulario } from './AbasFormulario'

/**
 * Valor de contrato em ASCII (`Mudanca`, M-5), rótulo com acento na exibição —
 * o rótulo vem do mesmo mapa que o índice público usa, para os dois nunca
 * divergirem.
 */
const TIPO_OPTIONS: SelectOption[] = (
  ['Conceito', 'Procedimento', 'Mudanca'] satisfies TipoArtigo[]
).map((tipo) => ({ value: tipo, label: ROTULO_TIPO_ARTIGO[tipo] }))

const artigoSchema = z.object({
  titulo: z.string().min(1, 'O título é obrigatório.').max(200, 'Máximo de 200 caracteres.'),
  tipo: z.enum(['Conceito', 'Procedimento', 'Mudanca'] as const, { error: 'Selecione o tipo.' }),
  corpo: z.string().min(1, 'O corpo do artigo é obrigatório.'),
  campoLayoutIds: z.array(z.string()),
  erroIds: z.array(z.string()),
})

type ArtigoFormValores = z.infer<typeof artigoSchema>

const CAMPOS_DO_FORMULARIO = [
  'titulo',
  'tipo',
  'corpo',
  'campoLayoutIds',
  'erroIds',
] as const satisfies readonly (keyof ArtigoFormValores)[]

export interface OpcaoReferenciaArtigo {
  id: number
  rotulo: string
}

export interface ArtigoFormProps {
  initialData?: ArtigoAdminDetalhe
  /** Pré-preenchimento na criação (ex.: "Criar agora" do artigo reservado). */
  sugestao?: { titulo: string; tipo: TipoArtigo }
  opcoesCamposLayout: OpcaoReferenciaArtigo[]
  opcoesErros: OpcaoReferenciaArtigo[]
  onSubmit: (dto: ArtigoFormDto) => void
  onCancel: () => void
  isSubmitting?: boolean
  erroServidor?: string | null
  /** Erros por campo do 422 — destacam o campo em vez de deixar só a mensagem geral. */
  errosDeCampo?: ErroDeCampoApi[]
}

function valoresIniciais(
  dado: ArtigoAdminDetalhe | undefined,
  sugestao: ArtigoFormProps['sugestao'],
): ArtigoFormValores {
  return {
    titulo: dado?.titulo ?? sugestao?.titulo ?? '',
    tipo: dado?.tipo ?? sugestao?.tipo ?? 'Conceito',
    corpo: dado?.corpo ?? '',
    campoLayoutIds: dado?.campoLayoutIds.map(String) ?? [],
    erroIds: dado?.erroIds.map(String) ?? [],
  }
}

/**
 * Formulário único de criar/editar artigo (I25/I26). "Burro": recebe
 * `onSubmit`/`onCancel` por prop e não conhece service nem hook de mutation —
 * quem orquestra é a página.
 *
 * `slug` não é campo: o backend deriva do título, e para o artigo reservado
 * `SlugsReservadosArtigo` garante que renomear o título nunca muda o slug.
 */
export function ArtigoForm({
  initialData,
  sugestao,
  opcoesCamposLayout,
  opcoesErros,
  onSubmit,
  onCancel,
  isSubmitting = false,
  erroServidor,
  errosDeCampo,
}: ArtigoFormProps) {
  const camposCheckboxId = useId()
  const errosCheckboxId = useId()
  const [painelDoCorpo, setPainelDoCorpo] = useState('editar')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ArtigoFormValores>({
    resolver: zodResolver(artigoSchema),
    defaultValues: valoresIniciais(initialData, sugestao),
  })

  useErrosDeCampoDoServidor(setError, CAMPOS_DO_FORMULARIO, errosDeCampo)

  const tipoAtual = watch('tipo')
  const corpoAtual = watch('corpo')
  const camposSelecionados = watch('campoLayoutIds')
  const errosSelecionados = watch('erroIds')

  function alternarSelecao(campo: 'campoLayoutIds' | 'erroIds', id: string) {
    const atual = campo === 'campoLayoutIds' ? camposSelecionados : errosSelecionados
    const proximo = atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
    setValue(campo, proximo, { shouldValidate: true })
  }

  function aoSubmeter(valores: ArtigoFormValores) {
    onSubmit({
      titulo: valores.titulo,
      tipo: valores.tipo,
      corpo: valores.corpo,
      campoLayoutIds: valores.campoLayoutIds.map(Number),
      erroIds: valores.erroIds.map(Number),
    })
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-5" noValidate>
      {erroServidor && (
        <p role="alert" className="text-sm text-error-texto">
          {erroServidor}
        </p>
      )}

      {initialData?.reservado && (
        <p role="status" className="text-xs text-muted">
          Artigo obrigatório: a rota pública <code>/como-funciona</code> aponta para ele. Renomear o
          título não muda o endereço, e o artigo não pode ser removido nem despublicado.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input label="Título" required error={errors.titulo?.message} {...register('titulo')} />
        <Select
          label="Tipo"
          required
          options={TIPO_OPTIONS}
          value={tipoAtual}
          // Editável de propósito (decisoes.md B-2): corrigir uma classificação
          // errada apagando e recriando quebraria o slug público.
          onValueChange={(valor) => setValue('tipo', valor as TipoArtigo, { shouldValidate: true })}
          error={errors.tipo?.message}
        />
      </div>

      <AbasFormulario
        ariaLabel="Corpo do artigo"
        valorAtivo={painelDoCorpo}
        onValorAtivoChange={setPainelDoCorpo}
        abas={[
          {
            valor: 'editar',
            rotulo: 'Editar',
            conteudo: (
              <Textarea
                label="Corpo"
                required
                rows={16}
                hint="Markdown restrito: títulos (##/###), listas, tabelas, links, código. HTML não é interpretado."
                error={errors.corpo?.message}
                {...register('corpo')}
              />
            ),
          },
          {
            valor: 'pre-visualizar',
            rotulo: 'Pré-visualizar',
            conteudo: corpoAtual.trim() ? (
              // Mesmo renderizador da página pública: um erro de sintaxe de
              // tabela aparece aqui, não só para o leitor depois de publicado.
              <ConteudoArtigo corpo={corpoAtual} className="flex flex-col gap-3 text-sm text-ink" />
            ) : (
              <p className="text-xs text-muted italic">
                Nada escrito ainda — a pré-visualização aparece conforme você escreve.
              </p>
            ),
          },
        ]}
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-normal text-ink lg:text-sm">
          Campos do layout relacionados
        </legend>
        <div className="flex flex-col gap-1.5">
          {opcoesCamposLayout.length === 0 && (
            <p className="text-xs text-muted italic">Nenhum campo de layout cadastrado ainda.</p>
          )}
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
                  onChange={() => alternarSelecao('campoLayoutIds', id)}
                />
                {opcao.rotulo}
              </label>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-normal text-ink lg:text-sm">Erros relacionados</legend>
        <div className="flex flex-col gap-1.5">
          {opcoesErros.length === 0 && (
            <p className="text-xs text-muted italic">Nenhum erro cadastrado ainda.</p>
          )}
          {opcoesErros.map((opcao) => {
            const id = String(opcao.id)
            const inputId = `${errosCheckboxId}-${id}`
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
                  checked={errosSelecionados.includes(id)}
                  onChange={() => alternarSelecao('erroIds', id)}
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
