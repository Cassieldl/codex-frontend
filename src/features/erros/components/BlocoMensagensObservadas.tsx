import { useId } from 'react'
import { BotaoCopiar } from '../../../components/ui/BotaoCopiar'

export interface BlocoMensagensObservadasProps {
  variantes: string[]
  codigoErro: string
}

/**
 * "Mensagens observadas" (§7.2) — o caminho crítico do produto: é por essas
 * variantes que a busca encontra o erro, e é nelas que o leitor se reconhece
 * ("é essa a mensagem que eu recebi"). Cada variante tem peso visual de
 * citação e seu próprio botão de copiar, com `aria-label` específico
 * (nunca "Copiar" genérico) e `id` único por item (AP-FRONTEND-003).
 */
export function BlocoMensagensObservadas({ variantes, codigoErro }: BlocoMensagensObservadasProps) {
  return (
    <section aria-labelledby="mensagens-observadas-titulo" className="flex flex-col gap-3">
      <h2 id="mensagens-observadas-titulo" className="text-subtitulo font-semibold text-ink">
        Mensagens observadas
      </h2>

      <ul className="flex flex-col gap-2">
        {variantes.map((texto, indice) => (
          <VarianteMensagem
            // A ordem das variantes é estável (vem do backend) — o índice
            // compõe a chave junto com o texto só como desempate defensivo.
            key={`${indice}-${texto}`}
            texto={texto}
            numero={indice + 1}
            codigoErro={codigoErro}
          />
        ))}
      </ul>
    </section>
  )
}

interface VarianteMensagemProps {
  texto: string
  numero: number
  codigoErro: string
}

function VarianteMensagem({ texto, numero, codigoErro }: VarianteMensagemProps) {
  const id = useId()

  return (
    <li
      id={`variante-mensagem-${id}`}
      className="flex items-start justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-white p-4"
    >
      <p className="whitespace-pre-wrap text-sm text-ink">{texto}</p>
      <BotaoCopiar
        valor={texto}
        ariaLabel={`Copiar mensagem observada ${numero} do erro ${codigoErro}`}
        rotulo="Copiar"
        className="shrink-0"
      />
    </li>
  )
}
