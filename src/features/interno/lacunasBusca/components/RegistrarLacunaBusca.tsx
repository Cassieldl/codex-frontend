import { useId, useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Toast } from '../../../../components/ui/Toast'
import { extrairErrosDeCampo, handleApiError } from '../../../../utils/handleApiError'
import { useRegistrarLacunaBusca } from '../hooks/useRegistrarLacunaBusca'

export interface RegistrarLacunaBuscaProps {
  /** Termo que a busca interna acabou de procurar sem achar nada. */
  termo: string
  parceiro: string
  numeroChamado: string
}

/** Identifica o que já foi registrado: mudar termo, parceiro ou chamado libera um novo registro. */
function montarChaveDoRegistro({ termo, parceiro, numeroChamado }: RegistrarLacunaBuscaProps) {
  return [termo, parceiro, numeroChamado].map((campo) => campo.trim()).join('|')
}

function mensagemDeErro(erro: unknown): string {
  const detalhes = extrairErrosDeCampo(erro).map((detalhe) => detalhe.message)
  return detalhes.length > 0 ? detalhes.join(' ') : handleApiError(erro)
}

/**
 * Registra no servidor a busca interna sem resultado, com o parceiro e o chamado já informados na
 * tela. Cada registro é uma ocorrência que pesa na fila; por isso, depois de registrar, o mesmo
 * conjunto não pode ser enviado de novo por um clique repetido.
 */
export function RegistrarLacunaBusca(props: RegistrarLacunaBuscaProps) {
  const { termo, parceiro, numeroChamado } = props
  const idErro = useId()
  const registrarLacuna = useRegistrarLacunaBusca()
  const [chaveRegistrada, setChaveRegistrada] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [avisoAberto, setAvisoAberto] = useState(false)

  const jaRegistrada = chaveRegistrada === montarChaveDoRegistro(props)

  function registrar() {
    setErro(null)
    const chave = montarChaveDoRegistro(props)

    registrarLacuna.mutate(
      {
        termo: termo.trim(),
        parceiro: parceiro.trim() || undefined,
        numeroChamado: numeroChamado.trim() || undefined,
      },
      {
        onSuccess: () => {
          setChaveRegistrada(chave)
          setAvisoAberto(true)
        },
        onError: (falha) => setErro(mensagemDeErro(falha)),
      },
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {!jaRegistrada && (
        <Button
          onClick={registrar}
          isLoading={registrarLacuna.isPending}
          aria-describedby={erro ? idErro : undefined}
        >
          Registrar lacuna
        </Button>
      )}

      {erro && (
        <p id={idErro} role="alert" className="text-sm text-error-texto">
          {erro}
        </p>
      )}

      {jaRegistrada && avisoAberto && (
        <Toast
          tone="success"
          message="Lacuna registrada. Ela entra na fila “O que documentar a seguir”."
          onClose={() => setAvisoAberto(false)}
        />
      )}

      {jaRegistrada && !avisoAberto && (
        <p className="text-xs text-muted">Lacuna registrada na fila editorial.</p>
      )}
    </div>
  )
}
