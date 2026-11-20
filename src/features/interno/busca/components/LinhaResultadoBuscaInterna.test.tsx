import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ResultadoItem } from '../../../busca/types/resultadoBusca'
import { LinhaResultadoBuscaInterna } from './LinhaResultadoBuscaInterna'

function criarItem(sobrescritas: Partial<ResultadoItem> = {}): ResultadoItem {
  return {
    tipo: 'erro',
    rotulo: 'Erro',
    chave: 'e0117-ipm',
    titulo: 'RPS inválido',
    url: '/erros/e0117-ipm',
    provedorNome: null,
    versaoRotulo: null,
    versoes: null,
    descricaoCasamento: '',
    campoCasado: 'mensagem',
    solucaoResumo: null,
    publicado: true,
    meta: null,
    pontuacao: 1,
    trechos: [],
    ...sobrescritas,
  }
}

// `userEvent.setup()` sobrescreve `navigator.clipboard` - espionar só depois
// dele (AP-FRONTEND-020), mesmo padrão de `BotaoCopiar.test.tsx`.
function configurarUsuarioComClipboard() {
  const usuario = userEvent.setup()
  const escreverNaAreaDeTransferencia = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined)
  return { usuario, escreverNaAreaDeTransferencia }
}

function renderizar(item: ResultadoItem) {
  return render(
    <ul>
      <LinhaResultadoBuscaInterna item={item} />
    </ul>,
  )
}

describe('LinhaResultadoBuscaInterna: PQ-09 (publicado por ITEM)', () => {
  it('item publicado oferece "Copiar link" com a URL pública', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    renderizar(criarItem())

    expect(screen.queryByText('Rascunho')).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Copiar link de RPS inválido' }))

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
      `${window.location.origin}/erros/e0117-ipm?origem=atendimento`,
    )
  })

  it('item em rascunho é etiquetado e copia o link interno, nunca a URL pública', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    renderizar(
      criarItem({
        tipo: 'artigo',
        titulo: 'Migrar para ABRASF 2.04',
        url: '/artigos/migrar-para-abrasf-204',
        publicado: false,
      }),
    )

    expect(screen.getByText('Rascunho')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copiar link de Migrar para ABRASF 2.04' }),
    ).not.toBeInTheDocument()

    await usuario.click(
      screen.getByRole('button', {
        name: 'Copiar link interno de Migrar para ABRASF 2.04 (leva à listagem de artigos, não ao registro)',
      }),
    )

    const copiado = escreverNaAreaDeTransferencia.mock.calls[0][0]
    expect(copiado).toBe(`${window.location.origin}/interno/artigos?origem=atendimento`)
    expect(copiado).not.toContain('/artigos/migrar-para-abrasf-204')
  })

  it('a publicação é lida do item, não de um irmão da lista', () => {
    render(
      <ul>
        <LinhaResultadoBuscaInterna item={criarItem({ titulo: 'Publicado' })} />
        <LinhaResultadoBuscaInterna
          item={criarItem({ titulo: 'Rascunho do acervo', publicado: false })}
        />
      </ul>,
    )

    expect(screen.getByRole('button', { name: 'Copiar link de Publicado' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Copiar link interno de Rascunho do acervo (leva à listagem de erros conhecidos, não ao registro)',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Rascunho')).toHaveLength(1)
  })

  it('rascunho sem rota de edição explica por que não há botão', () => {
    renderizar(criarItem({ tipo: 'aviso', titulo: 'Aviso de manutenção', publicado: false }))

    expect(screen.getByText('Sem link de edição direta')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('o item ativo da paleta vira option selecionada; fora dela, li puro', () => {
    const { rerender } = render(
      <ul>
        <LinhaResultadoBuscaInterna item={criarItem()} id="opcao-0" ativo />
      </ul>,
    )

    const opcao = screen.getByRole('option')
    expect(opcao).toHaveAttribute('id', 'opcao-0')
    expect(opcao).toHaveAttribute('aria-selected', 'true')

    rerender(
      <ul>
        <LinhaResultadoBuscaInterna item={criarItem()} />
      </ul>,
    )

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })
})

describe('LinhaResultadoBuscaInterna: F-3 (o link interno leva à lista, não ao registro)', () => {
  it('o rótulo visível do rascunho admite que o destino é a lista', () => {
    renderizar(criarItem({ titulo: 'RPS inválido', publicado: false }))

    expect(screen.getByText('Copiar link interno (lista)')).toBeInTheDocument()
    expect(screen.queryByText('Copiar link interno')).not.toBeInTheDocument()
  })

  it('o aria-label nomeia a listagem de destino e diz que não é o registro', () => {
    renderizar(criarItem({ titulo: 'RPS inválido', publicado: false }))

    expect(screen.getByRole('button')).toHaveAccessibleName(
      'Copiar link interno de RPS inválido (leva à listagem de erros conhecidos, não ao registro)',
    )
  })

  it('a listagem nomeada acompanha o tipo do item, nunca é uma frase fixa', () => {
    render(
      <ul>
        <LinhaResultadoBuscaInterna
          item={criarItem({ tipo: 'campolayout', titulo: 'tomador.cnpj', publicado: false })}
        />
        <LinhaResultadoBuscaInterna
          item={criarItem({ tipo: 'provedor', titulo: 'IPM', publicado: false })}
        />
      </ul>,
    )

    const nomes = screen.getAllByRole('button').map((botao) => botao.getAttribute('aria-label'))
    expect(nomes).toEqual([
      'Copiar link interno de tomador.cnpj (leva à listagem de campos do layout, não ao registro)',
      'Copiar link interno de IPM (leva à listagem de provedores, não ao registro)',
    ])
  })

  it('item publicado não ganha a ressalva - o link dele é o registro público mesmo', () => {
    renderizar(criarItem({ titulo: 'RPS inválido' }))

    expect(screen.getByText('Copiar link')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAccessibleName('Copiar link de RPS inválido')
    expect(screen.getByRole('button').getAttribute('aria-label')).not.toContain('listagem')
  })
})
