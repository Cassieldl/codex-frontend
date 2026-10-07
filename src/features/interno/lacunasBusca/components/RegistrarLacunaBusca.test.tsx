import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { LACUNA_RECORRENTE } from '../../../../test/mocks/lacunasBusca'
import { server } from '../../../../test/mocks/server'
import { RegistrarLacunaBusca, type RegistrarLacunaBuscaProps } from './RegistrarLacunaBusca'

const API_URL = import.meta.env.VITE_API_URL

function criarWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function handlerRegistrarCapturando(corpos: unknown[]) {
  return http.post(`${API_URL}/interno/lacunas-busca`, async ({ request }) => {
    corpos.push(await request.json())
    return HttpResponse.json(
      { data: LACUNA_RECORRENTE, message: 'Lacuna registrada.' },
      { status: 201 },
    )
  })
}

const PROPS: RegistrarLacunaBuscaProps = {
  termo: '  E0117 ipm ',
  parceiro: ' Prefeitura de Exemplo ',
  numeroChamado: '4521',
}

describe('RegistrarLacunaBusca', () => {
  it('registra com o termo, o parceiro e o chamado já informados, aparados', async () => {
    const usuario = userEvent.setup()
    const corpos: unknown[] = []
    server.use(handlerRegistrarCapturando(corpos))

    render(<RegistrarLacunaBusca {...PROPS} />, { wrapper: criarWrapper() })
    await usuario.click(screen.getByRole('button', { name: 'Registrar lacuna' }))

    expect(await screen.findByText(/lacuna registrada\. ela entra na fila/i)).toBeInTheDocument()
    expect(corpos).toEqual([
      { termo: 'E0117 ipm', parceiro: 'Prefeitura de Exemplo', numeroChamado: '4521' },
    ])
  })

  it('não envia parceiro nem chamado em branco', async () => {
    const usuario = userEvent.setup()
    const corpos: unknown[] = []
    server.use(handlerRegistrarCapturando(corpos))

    render(<RegistrarLacunaBusca termo="E0117 ipm" parceiro="   " numeroChamado="" />, {
      wrapper: criarWrapper(),
    })
    await usuario.click(screen.getByRole('button', { name: 'Registrar lacuna' }))

    await screen.findByText(/lacuna registrada/i)
    expect(corpos).toEqual([{ termo: 'E0117 ipm' }])
    expect(Object.keys(corpos[0] as object)).toEqual(['termo'])
  })

  it('um clique repetido não registra duas ocorrências', async () => {
    const usuario = userEvent.setup()
    const corpos: unknown[] = []
    server.use(
      http.post(`${API_URL}/interno/lacunas-busca`, async ({ request }) => {
        corpos.push(await request.json())
        await new Promise((resolver) => setTimeout(resolver, 150))
        return HttpResponse.json({ data: LACUNA_RECORRENTE, message: null }, { status: 201 })
      }),
    )

    render(<RegistrarLacunaBusca {...PROPS} />, { wrapper: criarWrapper() })
    const botao = screen.getByRole('button', { name: 'Registrar lacuna' })

    await usuario.dblClick(botao)
    await screen.findByText(/lacuna registrada\. ela entra na fila/i)

    expect(corpos).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Registrar lacuna' })).not.toBeInTheDocument()
  })

  it('mudar parceiro ou chamado depois de registrar libera um novo registro', async () => {
    const usuario = userEvent.setup()
    server.use(handlerRegistrarCapturando([]))

    const { rerender } = render(<RegistrarLacunaBusca {...PROPS} />, { wrapper: criarWrapper() })
    await usuario.click(screen.getByRole('button', { name: 'Registrar lacuna' }))
    await screen.findByText(/lacuna registrada\. ela entra na fila/i)

    rerender(<RegistrarLacunaBusca {...PROPS} numeroChamado="4599" />)

    expect(screen.getByRole('button', { name: 'Registrar lacuna' })).toBeInTheDocument()
  })

  it('mostra o motivo do 422 por campo e mantém o botão para tentar de novo', async () => {
    const usuario = userEvent.setup()
    server.use(
      http.post(`${API_URL}/interno/lacunas-busca`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Um ou mais campos são inválidos.',
              details: [
                {
                  field: 'numeroChamado',
                  message: 'O número do chamado tem no máximo 60 caracteres.',
                },
              ],
            },
          },
          { status: 422 },
        ),
      ),
    )

    render(<RegistrarLacunaBusca {...PROPS} />, { wrapper: criarWrapper() })
    await usuario.click(screen.getByRole('button', { name: 'Registrar lacuna' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O número do chamado tem no máximo 60 caracteres.',
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Registrar lacuna' })).toBeEnabled(),
    )
  })

  it('erro sem envelope cai na mensagem padrão', async () => {
    const usuario = userEvent.setup()
    server.use(
      http.post(`${API_URL}/interno/lacunas-busca`, () => new HttpResponse(null, { status: 500 })),
    )

    render(<RegistrarLacunaBusca {...PROPS} />, { wrapper: criarWrapper() })
    await usuario.click(screen.getByRole('button', { name: 'Registrar lacuna' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ocorreu um erro inesperado.')
  })
})
