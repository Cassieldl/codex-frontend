const EXEMPLOS: ReadonlyArray<{ titulo: string; markdown: string }> = [
  {
    titulo: 'Resumo rápido',
    markdown: '> [!RESUMO]\n> O que o leitor precisa saber em duas linhas.',
  },
  {
    titulo: 'Caixa de destaque (DICA, ATENCAO ou IMPORTANTE)',
    markdown: '> [!ATENCAO]\n> Confira o ambiente antes de emitir.',
  },
  {
    titulo: 'Passo a passo',
    markdown:
      '> [!PASSOS]\n> 1. Abra o painel.\n>    ![Painel aberto](/imagens/erro-173-chave-de-comunicacao/menu-ferramentas-de-integracao.png "Legenda")\n> 2. Salve.',
  },
  {
    titulo: 'Recolhível',
    markdown:
      '> [!DETALHES] Ver a tabela completa\n>\n> | Campo | Obrigatório |\n> | - | - |\n> | CNPJ | Sim |',
  },
  {
    titulo: 'Fluxo',
    markdown: '```fluxo\nEnvio: o sistema transmite o RPS\nRetorno: a prefeitura responde\n```',
  },
  {
    titulo: 'Imagem (só de /imagens/)',
    markdown:
      '![Texto alternativo](/imagens/erro-173-chave-de-comunicacao/menu-ferramentas-de-integracao.png "Legenda opcional")',
  },
  {
    titulo: 'Sim/Não em tabela',
    markdown: '| Campo | Obrigatório |\n| - | - |\n| CNPJ | Sim |\n| CPF | Não |',
  },
]

/** Referência rápida dos blocos que o renderizador entende; fechada por padrão para não ocupar o editor. */
export function AjudaDeFormatacao() {
  return (
    <details className="rounded-[var(--radius-control)] border border-border p-3 text-sm text-ink">
      <summary className="cursor-pointer font-semibold">Formatação disponível</summary>
      <dl className="mt-3 flex flex-col gap-3">
        {EXEMPLOS.map((exemplo) => (
          <div key={exemplo.titulo} className="flex flex-col gap-1">
            <dt className="text-xs font-semibold">{exemplo.titulo}</dt>
            <dd>
              <pre className="overflow-x-auto rounded-[var(--radius-control)] bg-surface-disabled p-2 font-mono text-xs">
                {exemplo.markdown}
              </pre>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
