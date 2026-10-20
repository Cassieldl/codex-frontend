import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { SecaoExemplosVersao } from './SecaoExemplosVersao'
import { MENSAGEM_DE_CONFLITO } from '../../utils/mensagemDeErroDeEscrita'

/**
 * Literal de propósito: é contrato com `CapExemplosPorVersao` do backend. Importar a constante da
 * unidade sob teste faria fixture e asserção subirem juntas, e mudar o cap não derrubaria nada.
 */
const CAP_EXEMPLOS_POR_VERSAO = 10

const API_URL = import.meta.env.VITE_API_URL

const VERSAO_ID = 10

// JSON literal transcrito de ExemploAdminDto, sem o tipo do cliente.
function exemplo(id: number) {
  return {
    id,
    versaoProvedorId: VERSAO_ID,
    slug: `cenario-${id}`,
    nome: `Cenário ${id}`,
    descricao: null,
    xml: '<nfse />',
    versaoConcorrencia: id,
  }
}

function handlerLista(quantidade: number) {
  return http.get(`${API_URL}/interno/versoes/${VERSAO_ID}/exemplos`, () =>
    HttpResponse.json({
      data: Array.from({ length: quantidade }, (_, indice) => exemplo(indice + 1)),
      message: null,
    }),
  )
}

function renderizar(props?: Partial<Parameters<typeof SecaoExemplosVersao>[0]>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return render(
    <SecaoExemplosVersao
      versaoId={VERSAO_ID}
      podeBuscar
      podeAdicionar
      podeAtualizar
      podeRemover
      {...props}
    />,
    { wrapper: Wrapper },
  )
}

describe('SecaoExemplosVersao — estados de UI', () => {
  it('anuncia o carregamento antes da lista chegar', async () => {
    server.use(handlerLista(1))
    renderizar()

    expect(screen.getByText('Carregando exemplos…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Cenário 1')).toBeInTheDocument())
  })

  it('erro da API oferece tentar de novo, sem tela em branco', async () => {
    server.use(
      http.get(`${API_URL}/interno/versoes/${VERSAO_ID}/exemplos`, () =>
        HttpResponse.json({ error: { code: 'ERRO_INTERNO', message: 'falhou' } }, { status: 500 }),
      ),
    )
    renderizar()

    expect(
      await screen.findByText('Não foi possível carregar os exemplos desta versão.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('versão sem exemplo mostra estado vazio, nunca uma tabela sem linhas', async () => {
    server.use(handlerLista(0))
    renderizar()

    expect(
      await screen.findByText('Nenhum exemplo cadastrado nesta versão ainda.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('lista mostra o nome e a âncora pública de cada cenário', async () => {
    server.use(handlerLista(2))
    renderizar()

    expect(await screen.findByText('Cenário 1')).toBeInTheDocument()
    expect(screen.getByText('#exemplo-cenario-2')).toBeInTheDocument()
  })
})

describe('SecaoExemplosVersao — cap de 10 por versão (C3)', () => {
  it('no limite, o botão de criar fica desabilitado e diz por quê', async () => {
    server.use(handlerLista(CAP_EXEMPLOS_POR_VERSAO))
    renderizar()

    await screen.findByText('Cenário 1')

    const botao = screen.getByRole('button', { name: 'Novo exemplo' })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute(
      'title',
      `Limite de ${CAP_EXEMPLOS_POR_VERSAO} exemplos por versão atingido.`,
    )
  })

  it('com um exemplo a menos que o limite, criar continua disponível', async () => {
    server.use(handlerLista(CAP_EXEMPLOS_POR_VERSAO - 1))
    renderizar()

    await screen.findByText('Cenário 1')

    const botao = screen.getByRole('button', { name: 'Novo exemplo' })
    expect(botao).toBeEnabled()
    expect(botao).not.toHaveAttribute('title')
  })
})

describe('SecaoExemplosVersao — permissões', () => {
  it('sem exemplos-adicionar, não há botão de criar (mas a seção aparece)', async () => {
    server.use(handlerLista(1))
    renderizar({ podeAdicionar: false })

    // Âncora de montagem primeiro: sem ela, a ausência abaixo passaria só porque
    // a lista ainda não chegou.
    expect(await screen.findByText('Cenário 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Novo exemplo' })).not.toBeInTheDocument()
  })

  it('sem exemplos-atualizar nem exemplos-remover, a linha não oferece as ações', async () => {
    server.use(handlerLista(1))
    renderizar({ podeAtualizar: false, podeRemover: false })

    expect(await screen.findByText('Cenário 1')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Editar exemplo Cenário 1' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Remover exemplo Cenário 1' }),
    ).not.toBeInTheDocument()
  })

  /**
   * Sem a role de leitura o `GET` volta `403` em toda tentativa — um `ErrorState`
   * com "Tentar novamente" prometeria uma recuperação que não existe. E a query
   * nem sai: o handler de lista não é registrado, então uma chamada derrubaria o
   * teste (`onUnhandledRequest: 'error'`).
   */
  it('sem exemplos-buscar, explica a ausência em vez de falhar o carregamento', async () => {
    renderizar({ podeBuscar: false })

    expect(
      await screen.findByText('Você não tem permissão para ver os exemplos desta versão.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
    expect(screen.queryByText('Carregando exemplos…')).not.toBeInTheDocument()
  })
})

describe('SecaoExemplosVersao — escrita', () => {
  it('criar fecha o modal e a lista converge para o novo cenário', async () => {
    const usuario = userEvent.setup()
    let criados = 0

    server.use(
      http.get(`${API_URL}/interno/versoes/${VERSAO_ID}/exemplos`, () =>
        HttpResponse.json({
          data: criados === 0 ? [] : [{ ...exemplo(1), nome: 'Nota simples' }],
          message: null,
        }),
      ),
      http.post(`${API_URL}/interno/versoes/${VERSAO_ID}/exemplos`, () => {
        criados += 1
        return HttpResponse.json(
          { data: { ...exemplo(1), nome: 'Nota simples' }, message: null },
          { status: 201 },
        )
      }),
    )

    renderizar()
    await screen.findByText('Nenhum exemplo cadastrado nesta versão ainda.')

    await usuario.click(screen.getByRole('button', { name: 'Novo exemplo' }))
    await usuario.type(screen.getByRole('textbox', { name: /Nome do cenário/ }), 'Nota simples')
    await usuario.type(screen.getByRole('textbox', { name: /XML/ }), '<nfse />')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Nota simples')).toBeInTheDocument()
  })

  it('erro na criação mantém o modal aberto com a mensagem do backend', async () => {
    const usuario = userEvent.setup()

    server.use(
      handlerLista(0),
      http.post(`${API_URL}/interno/versoes/${VERSAO_ID}/exemplos`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'REGISTRO_DUPLICADO',
              message: 'Já existe um exemplo com este nome nesta versão.',
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderizar()
    await screen.findByText('Nenhum exemplo cadastrado nesta versão ainda.')

    await usuario.click(screen.getByRole('button', { name: 'Novo exemplo' }))
    await usuario.type(screen.getByRole('textbox', { name: /Nome do cenário/ }), 'Nota simples')
    await usuario.type(screen.getByRole('textbox', { name: /XML/ }), '<nfse />')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um exemplo com este nome nesta versão.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Nome do cenário/ })).toHaveValue('Nota simples')
  })
})

describe('SecaoExemplosVersao — remoção', () => {
  it('pede confirmação antes de remover — o clique na lixeira não apaga nada', async () => {
    const usuario = userEvent.setup()
    let exclusoes = 0

    server.use(
      handlerLista(1),
      http.delete(`${API_URL}/interno/exemplos/1`, () => {
        exclusoes += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderizar()
    await screen.findByText('Cenário 1')

    await usuario.click(screen.getByRole('button', { name: 'Remover exemplo Cenário 1' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Cenário 1')
    expect(exclusoes).toBe(0)

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(exclusoes).toBe(0)
  })

  it('falha na remoção aparece no diálogo, em vez de sumir em silêncio', async () => {
    const usuario = userEvent.setup()

    server.use(
      handlerLista(1),
      http.delete(`${API_URL}/interno/exemplos/1`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLITO_CONCORRENCIA',
              message: 'O exemplo foi alterado por outra pessoa. Recarregue e tente de novo.',
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderizar()
    await screen.findByText('Cenário 1')

    await usuario.click(screen.getByRole('button', { name: 'Remover exemplo Cenário 1' }))
    await usuario.click(screen.getByRole('button', { name: 'Remover' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_DE_CONFLITO.acao)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
