import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { GrupoResultado, ResultadoItem } from '../../../busca/types/resultadoBusca'
import { ResultadoBuscaInternaLista } from './ResultadoBuscaInternaLista'

function criarItem(sobrescritas: Partial<ResultadoItem>): ResultadoItem {
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

function criarGrupo(itens: ResultadoItem[]): GrupoResultado[] {
  return [
    {
      tipo: 'erro',
      rotulo: 'Erros',
      total: itens.length,
      pontuacao: 1,
      itens,
    },
  ]
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

describe('ResultadoBuscaInternaLista: BAIXO-03/BAIXO-04 após a extração da linha', () => {
  it('item com url interna válida: link aponta pro caminho e "Copiar link" usa o mesmo caminho saneado', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    render(<ResultadoBuscaInternaLista grupos={criarGrupo([criarItem({})])} />)

    const link = screen.getByRole('link', { name: 'RPS inválido' })
    expect(link).toHaveAttribute('href', '/erros/e0117-ipm')

    await usuario.click(screen.getByRole('button', { name: 'Copiar link de RPS inválido' }))

    // O caminho copiado é o saneado, agora marcado com a origem do atendimento
    // (§9.3) - a mesma regra que a barra de comando usa.
    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
      `${window.location.origin}/erros/e0117-ipm?origem=atendimento`,
    )
  })

  it('BAIXO-04: url "@evil.com" (userinfo spoofing) não vira link nem oferece "Copiar link"', () => {
    render(
      <ResultadoBuscaInternaLista
        grupos={criarGrupo([criarItem({ url: '@evil.com', titulo: 'Item malformado' })])}
      />,
    )

    expect(screen.getByText('Item malformado')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Item malformado' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copiar link de Item malformado' }),
    ).not.toBeInTheDocument()
  })

  it('BAIXO-04: url ".evil.com" (subdomínio do atacante) não vira link nem oferece "Copiar link"', () => {
    render(
      <ResultadoBuscaInternaLista
        grupos={criarGrupo([criarItem({ url: '.evil.com', titulo: 'Item malformado' })])}
      />,
    )

    expect(screen.getByText('Item malformado')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Item malformado' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copiar link de Item malformado' }),
    ).not.toBeInTheDocument()
  })

  it('BAIXO-03: url com TAB no meio (bypass de whitespace) não vira link nem oferece "Copiar link"', () => {
    const urlComTab = `/${String.fromCharCode(9)}/evil.com`
    render(
      <ResultadoBuscaInternaLista
        grupos={criarGrupo([criarItem({ url: urlComTab, titulo: 'Item com TAB' })])}
      />,
    )

    expect(screen.getByText('Item com TAB')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Item com TAB' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copiar link de Item com TAB' }),
    ).not.toBeInTheDocument()
  })

  it('o agrupamento por tipo sobrevive à extração, e cada linha decide o próprio link', async () => {
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    render(
      <ResultadoBuscaInternaLista
        grupos={[
          {
            tipo: 'erro',
            rotulo: 'Erros',
            total: 1,
            pontuacao: 2,
            itens: [criarItem({})],
          },
          {
            tipo: 'artigo',
            rotulo: 'Artigos',
            total: 1,
            pontuacao: 1,
            itens: [
              criarItem({
                tipo: 'artigo',
                titulo: 'Artigo em rascunho',
                url: '/artigos/rascunho',
                publicado: false,
              }),
            ],
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: /Erros/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Artigos/ })).toBeInTheDocument()

    await usuario.click(
      screen.getByRole('button', {
        name: 'Copiar link interno de Artigo em rascunho (leva à listagem de artigos, não ao registro)',
      }),
    )

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
      `${window.location.origin}/interno/artigos?origem=atendimento`,
    )
  })
})
