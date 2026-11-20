import clsx from 'clsx'
import { Check, Copy, Link2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type IconeCopiar = 'copiar' | 'link'

export type SuperficieDoBotaoCopiar = 'clara' | 'escura'

export interface BotaoCopiarProps {
  valor: string | (() => string)
  /** Específico do contexto, nunca "Copiar" genérico (ex.: "Copiar link do verbete RPS"). */
  ariaLabel: string
  /** Texto do botão. Em `compacto`, vira a dica que aparece no hover e no foco. */
  rotulo: string
  /**
   * Distingue as duas ações quando elas aparecem lado a lado. Prancheta copia um valor;
   * elo copia um endereço. Sem isso, dois botões de "cópia" ficam idênticos.
   */
  icone?: IconeCopiar
  /**
   * Esconde o rótulo, deixando só o ícone, para tabela densa, onde dois botões rotulados por
   * linha competem com o conteúdo.
   *
   * O rótulo não é removido, muda de lugar: vira dica visível no hover **e no foco por teclado**.
   * Dica só de hover deixaria quem usa toque ou teclado sem saber o que o botão faz, e é por isso
   * que o modo compacto não é o padrão.
   */
  compacto?: boolean
  /** `escura` para a barra de um painel escuro: fundo translúcido e texto branco. */
  superficie?: SuperficieDoBotaoCopiar
  className?: string
}

const DURACAO_ESTADO_COPIADO_MS = 2000

type ResultadoDaCopia = 'nenhum' | 'copiado' | 'falhou'

const ROTULO_DO_RESULTADO: Record<Exclude<ResultadoDaCopia, 'nenhum'>, string> = {
  copiado: 'Copiado',
  falhou: 'Não copiado',
}

const ANUNCIO_DO_RESULTADO: Record<ResultadoDaCopia, string> = {
  nenhum: '',
  copiado: 'Copiado',
  falhou: 'Não foi possível copiar. Selecione o texto e copie manualmente.',
}

const CLASSE_DA_SUPERFICIE: Record<SuperficieDoBotaoCopiar, string> = {
  clara: 'border-border bg-white font-medium text-ink',
  escura: 'border-transparent bg-white/10 font-bold text-white',
}

const ICONE: Record<IconeCopiar, typeof Copy> = {
  copiar: Copy,
  link: Link2,
}

export function BotaoCopiar({
  valor,
  ariaLabel,
  rotulo,
  icone = 'copiar',
  compacto = false,
  superficie = 'clara',
  className,
}: BotaoCopiarProps) {
  const [resultado, setResultado] = useState<ResultadoDaCopia>('nenhum')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function handleClick() {
    const valorFinal = typeof valor === 'function' ? valor() : valor

    // Sem permissão, fora de contexto seguro ou sem a API, a cópia falha: nunca anunciar sucesso.
    try {
      await navigator.clipboard.writeText(valorFinal)
      mostrarResultado('copiado')
    } catch {
      mostrarResultado('falhou')
    }
  }

  function mostrarResultado(novoResultado: ResultadoDaCopia) {
    setResultado(novoResultado)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setResultado('nenhum'), DURACAO_ESTADO_COPIADO_MS)
  }

  const Icone = resultado === 'copiado' ? Check : resultado === 'falhou' ? X : ICONE[icone]
  const textoVisivel = resultado === 'nenhum' ? rotulo : ROTULO_DO_RESULTADO[resultado]

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={clsx(
        // Caixa visual pequena (h-8), mas alvo de toque 44×44 via ::after
        // com preenchimento invisível: nunca cresce a caixa visível em si.
        "group relative inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border text-xs after:absolute after:top-1/2 after:left-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
        CLASSE_DA_SUPERFICIE[superficie],
        compacto ? 'w-8 justify-center' : 'px-2.5',
        'hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover',
        className,
      )}
    >
      <Icone
        className={clsx(
          'size-3.5 shrink-0',
          superficie === 'clara' && resultado === 'copiado' && 'text-success',
          superficie === 'clara' && resultado === 'falhou' && 'text-error-texto',
        )}
        aria-hidden="true"
      />

      {compacto ? (
        /* A dica responde a foco além de hover: teclado e leitor de foco alcançam o mesmo que o
           mouse. `aria-hidden` evita que o leitor de tela anuncie o texto duas vezes, já que o
           `aria-label` do botão cobre.

           Ancorada pela direita do botão, ela cresce só para a esquerda. Centralizada, a dica do
           último botão da linha passava da borda da tabela e, mesmo transparente, contava como
           área rolável: a tabela ganhava barra de rolagem horizontal. */
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-full z-10 mb-1 rounded-[var(--radius-control)] bg-ink px-2 py-1 text-aux whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {textoVisivel}
        </span>
      ) : (
        textoVisivel
      )}

      <span role="status" aria-live="polite" className="sr-only">
        {ANUNCIO_DO_RESULTADO[resultado]}
      </span>
    </button>
  )
}
