import { Link } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import type { ErroDoCampo } from '../types/versaoProvedorPagina'

export interface IndicadorErrosDoCampoProps {
  erros: ErroDoCampo[]
  nomeDoCampo: string
}

/**
 * Marca, na própria linha da tabela, que o campo já tem rejeição registrada nesta versão.
 *
 * O elo erro → campo sempre existiu na página do erro; este é o sentido inverso, e é o que
 * responde a pergunta que traz o leitor ao portal — "o que eu preenchi errado?". Sem ele, quem
 * suspeita de um campo lê a linha dele sem saber que a rejeição está documentada logo abaixo, no
 * bloco "Erros conhecidos" da mesma página, sem nada ligando as duas coisas.
 *
 * O link vai direto ao erro, não à âncora do bloco: quem clica quer a causa e a solução, que só
 * existem na página do erro.
 *
 * A cor é a de severidade "alerta", reservada a risco — a mesma paleta dos avisos. Medido:
 * `#8a4b00` sobre `#fffbef` dá 6.6:1, acima de AA mesmo no tamanho auxiliar.
 * A obrigatoriedade continua sem cor, porque é o papel mais repetido da tela e colori-la tiraria
 * a força justamente do que sinaliza problema.
 */
export function IndicadorErrosDoCampo({ erros, nomeDoCampo }: IndicadorErrosDoCampoProps) {
  if (erros.length === 0) return null

  return (
    <span className="ml-2 inline-flex flex-wrap items-center gap-1 align-middle">
      <TriangleAlert
        aria-hidden="true"
        className="size-3.5 shrink-0 text-severidade-alerta-texto"
      />
      {erros.map((erro) => (
        <Link
          key={erro.slug}
          to="/erros/$erroSlug"
          params={{ erroSlug: erro.slug }}
          // O rótulo acessível diz o campo e o código: lido fora da linha, "E-1023" sozinho não
          // situa ninguém.
          aria-label={`Rejeição ${erro.codigo} registrada no campo ${nomeDoCampo}`}
          className="rounded-[var(--radius-pill)] border border-border-control bg-alert-warning px-1.5 py-0.5 font-mono text-aux font-semibold text-severidade-alerta-texto hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
        >
          {erro.codigo}
        </Link>
      ))}
    </span>
  )
}
