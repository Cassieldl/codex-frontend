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
    publicado: true,
    meta: null,
    pontuacao: 1,
    trechos: [],
    ...sobrescritas,
  }
}

// `userEvent.setup()` sobrescreve `navigator.clipboard` — espionar só depois
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

describe('LinhaResultadoBuscaInterna — PQ-09 (publicado por ITEM)', () => {
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
      screen.getByRole('button', { name: 'Copiar link interno de Migrar para ABRASF 2.04' }),
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
      screen.getByRole('button', { name: 'Copiar link interno de Rascunho do acervo' }),
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
