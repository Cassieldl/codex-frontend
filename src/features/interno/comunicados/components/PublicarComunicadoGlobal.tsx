import { Megaphone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../../../components/ui/Modal'
import { Toast } from '../../../../components/ui/Toast'
import { usePermissoesInterno } from '../../hooks/usePermissoesInterno'
import { useProvedoresAdmin } from '../../provedores/hooks/useProvedoresAdmin'
import { useCriarComunicado } from '../hooks/useCriarComunicado'
import type { ComunicadoFormDto } from '../types/comunicadoAdmin'
import type { ErroDeEscritaComunicado } from '../utils/erroDeEscritaComunicado'
import { interpretarErroDeEscritaComunicado } from '../utils/erroDeEscritaComunicado'
import { ComunicadoForm, type OpcaoProvedorComunicado } from './ComunicadoForm'

const DURACAO_TOAST_MS = 4000

interface FormularioComunicadoGlobalProps {
  publicarAoSalvar: boolean
  onSucesso: (mensagemDoBackend: string | null) => void
  onCancelar: () => void
}

/**
 * Só monta com o modal aberto: os provedores do select de escopo são um
 * round-trip por página da área interna se o hook viver no botão, e o botão
 * está em toda tela.
 */
function FormularioComunicadoGlobal({
  publicarAoSalvar,
  onSucesso,
  onCancelar,
}: FormularioComunicadoGlobalProps) {
  // Guarda o erro inteiro, não só a mensagem: o 422 traz os campos culpados, e é o terceiro
  // consumidor deste formulário - sem isto, só aqui o editor leria "um ou mais campos são
  // inválidos" sem saber qual.
  const [erroServidor, setErroServidor] = useState<ErroDeEscritaComunicado | null>(null)

  const { data: provedores } = useProvedoresAdmin({ tamanhoPagina: 200 })
  const opcoesProvedores: OpcaoProvedorComunicado[] = (provedores?.items ?? []).map((provedor) => ({
    id: provedor.id,
    nome: provedor.nome,
  }))

  // Mesmo hook da tela 12 - nunca um segundo caminho de criação. Ele já
  // invalida `comunicadosAdminKeys.lists()`, então a tela 12 converge sozinha.
  const criarComunicado = useCriarComunicado()

  function aoSalvar(dto: ComunicadoFormDto) {
    setErroServidor(null)
    // `publicar` é decidido pela role ANTES do submit (G1): o formulário nunca
    // oferece a escolha, e o payload nunca pede o que o usuário não pode fazer.
    criarComunicado.mutate(
      { ...dto, publicar: publicarAoSalvar },
      {
        onSuccess: (resultado) => onSucesso(resultado.mensagem),
        // Erro nunca fecha o modal: o que foi digitado continua na tela.
        onError: (erro) => setErroServidor(interpretarErroDeEscritaComunicado(erro)),
      },
    )
  }

  return (
    <ComunicadoForm
      opcoesProvedores={opcoesProvedores}
      onSubmit={aoSalvar}
      onCancel={onCancelar}
      isSubmitting={criarComunicado.isPending}
      erroServidor={erroServidor?.mensagem ?? null}
      errosDeCampo={erroServidor?.errosDeCampo}
    />
  )
}

/**
 * Publicar comunicado de qualquer tela da área interna (§10). Mesmo
 * formulário da tela 12, reusado inteiro - "formulário mínimo" no escopo é
 * leitura de UX, não um segundo formulário com outras regras.
 *
 * Nasce escondido sem `comunicados-adicionar`: o botão global não tem página
 * que faça a checagem por ele.
 *
 * D-1: com `comunicados-publicar` o rótulo "Publicar comunicado" passa a ser
 * verdadeiro - o comunicado nasce no ar, em uma só escrita (I32 com
 * `publicar: true`). Sem a role, o botão se chama "Novo comunicado" e cria
 * rascunho. O que o toast diz vem da `message` do backend, nunca do que foi
 * pedido: pedir para publicar e ter publicado são coisas diferentes, e afirmar
 * a primeira pela segunda é a mentira que D-1 veio corrigir.
 */
export function PublicarComunicadoGlobal() {
  const permissoes = usePermissoesInterno()
  const [aberto, setAberto] = useState(false)
  const [avisoDeSucesso, setAvisoDeSucesso] = useState<string | null>(null)
  const timeoutDoAviso = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (timeoutDoAviso.current) clearTimeout(timeoutDoAviso.current)
    }
  }, [])

  if (!permissoes.comunicados.adicionar) return null

  const podePublicar = permissoes.comunicados.publicar
  const rotulo = podePublicar ? 'Publicar comunicado' : 'Novo comunicado'

  function aoCriar(mensagemDoBackend: string | null) {
    setAberto(false)
    // `null` só aconteceria se o backend omitisse `message` numa escrita
    // bem-sucedida, o que o contrato de I32 não faz. O texto de reserva é
    // neutro de propósito: nunca afirma publicação que não foi confirmada.
    setAvisoDeSucesso(mensagemDoBackend ?? 'Comunicado salvo.')

    if (timeoutDoAviso.current) clearTimeout(timeoutDoAviso.current)
    timeoutDoAviso.current = setTimeout(() => setAvisoDeSucesso(null), DURACAO_TOAST_MS)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium text-ink hover:shadow-hover"
      >
        <Megaphone className="size-4" aria-hidden="true" />
        {rotulo}
      </button>

      <Modal isOpen={aberto} onClose={() => setAberto(false)} title={rotulo} size="md">
        {aberto && (
          <FormularioComunicadoGlobal
            publicarAoSalvar={podePublicar}
            onSucesso={aoCriar}
            onCancelar={() => setAberto(false)}
          />
        )}
      </Modal>

      {avisoDeSucesso && (
        <div className="fixed top-4 right-4 z-50 w-80">
          <Toast tone="success" message={avisoDeSucesso} onClose={() => setAvisoDeSucesso(null)} />
        </div>
      )}
    </>
  )
}
