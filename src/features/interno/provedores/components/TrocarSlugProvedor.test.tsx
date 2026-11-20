import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { TrocarSlugProvedor } from './TrocarSlugProvedor'
import { MENSAGEM_DE_CONFLITO } from '../../utils/mensagemDeErroDeEscrita'

const API_URL = import.meta.env.VITE_API_URL

const PROVEDOR_ID = 42

const provedorRenomeado = {
  id: PROVEDOR_ID,
  slug: 'prefeitura-de-sao-jose',
  nome: 'Prefeitura de São José',
  categoria: 'Nacional',
  identificadorInvoicy: 'PREF-SJ',
  aliases: [],
  publicado: true,
  avisos: [],
  versaoConcorrencia: 8,
}

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return render(
    <TrocarSlugProvedor
      provedorId={PROVEDOR_ID}
      slugAtual="prefeitura-de-exemplo"
      etag={'W/"7"'}
    />,
    { wrapper: Wrapper },
  )
}

async function abrirModal(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('button', { name: 'Trocar endereço' }))
  await screen.findByRole('dialog')
}

describe('TrocarSlugProvedor (I37)', () => {
  it('o modal mostra o endereço atual e o aviso de redirecionamento antes de qualquer digitação', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await abrirModal(usuario)

    expect(screen.getByText('/provedores/prefeitura-de-exemplo')).toBeInTheDocument()
    expect(
      screen.getByText(
        /redireciona automaticamente para o novo, mas isso pode levar minutos para propagar/,
      ),
    ).toBeInTheDocument()
  })

  it('formato inválido bloqueia o submit: nada chega ao servidor', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await abrirModal(usuario)

    // Sem handler de PUT registrado: uma chamada derrubaria o teste
    // (`onUnhandledRequest: 'error'`).
    await usuario.type(screen.getByRole('textbox', { name: /Novo endereço/ }), 'Prefeitura SJ')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar troca' }))

    expect(
      await screen.findByText('Use apenas letras minúsculas, números e hífen.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('endereço só de hífen reprova aqui: normalizaria para vazio no servidor', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await abrirModal(usuario)

    await usuario.type(screen.getByRole('textbox', { name: /Novo endereço/ }), '---')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar troca' }))

    expect(
      await screen.findByText('O endereço precisa conter ao menos uma letra ou número.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('endereço com 161 caracteres reprova aqui: é o teto real do backend, 160', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await abrirModal(usuario)

    // `fireEvent` em vez de `type`: 161 teclas simuladas custam segundos sem
    // acrescentar nada ao que se quer provar.
    fireEvent.change(screen.getByRole('textbox', { name: /Novo endereço/ }), {
      target: { value: 'a'.repeat(161) },
    })
    await usuario.click(screen.getByRole('button', { name: 'Confirmar troca' }))

    expect(await screen.findByText('Máximo de 160 caracteres.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('endereço com exatamente 160 caracteres passa e chega ao servidor', async () => {
    const usuario = userEvent.setup()
    const slugNoLimite = 'a'.repeat(160)
    let slugRecebido: string | null = null

    server.use(
      http.put(`${API_URL}/interno/provedores/${PROVEDOR_ID}/slug`, async ({ request }) => {
        slugRecebido = ((await request.json()) as { slug: string }).slug
        return HttpResponse.json({
          data: { ...provedorRenomeado, slug: slugNoLimite },
          message: null,
        })
      }),
    )

    renderizar()
    await abrirModal(usuario)

    fireEvent.change(screen.getByRole('textbox', { name: /Novo endereço/ }), {
      target: { value: slugNoLimite },
    })
    await usuario.click(screen.getByRole('button', { name: 'Confirmar troca' }))

    await waitFor(() => expect(slugRecebido).toBe(slugNoLimite))
  })

  it('409 de endereço já usado marca o CAMPO, não a faixa de erro do formulário', async () => {
    const usuario = userEvent.setup()
    server.use(
      http.put(`${API_URL}/interno/provedores/${PROVEDOR_ID}/slug`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'REGISTRO_DUPLICADO',
              message: 'Este endereço já pertence a outro provedor.',
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderizar()
    await abrirModal(usuario)

    const campo = screen.getByRole('textbox', { name: /Novo endereço/ })
    await usuario.type(campo, 'prefeitura-de-sao-jose')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar troca' }))

    await waitFor(() => expect(campo).toHaveAttribute('aria-invalid', 'true'))
    expect(
      await screen.findByText('Este endereço já pertence a outro provedor.'),
    ).toBeInTheDocument()
    // Erro de valor digitado nunca vira faixa genérica de formulário.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('409 de concorrência NÃO é erro do campo: é faixa de formulário', async () => {
    const usuario = userEvent.setup()
    server.use(
      http.put(`${API_URL}/interno/provedores/${PROVEDOR_ID}/slug`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLITO_CONCORRENCIA',
              message:
                'O provedor foi alterado por outra requisição. Recarregue e tente novamente.',
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderizar()
    await abrirModal(usuario)

    const campo = screen.getByRole('textbox', { name: /Novo endereço/ })
    await usuario.type(campo, 'prefeitura-de-sao-jose')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar troca' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_DE_CONFLITO.formulario)
    // O valor digitado não é o culpado: marcar o campo mandaria o editor corrigir
    // o que estava certo.
    expect(campo).toHaveAttribute('aria-invalid', 'false')
  })

  it('sucesso fecha o modal e confirma com o endereço novo e o redirecionamento', async () => {
    const usuario = userEvent.setup()
    server.use(
      http.put(`${API_URL}/interno/provedores/${PROVEDOR_ID}/slug`, () =>
        HttpResponse.json({ data: provedorRenomeado, message: null }),
      ),
    )

    renderizar()
    await abrirModal(usuario)

    await usuario.type(
      screen.getByRole('textbox', { name: /Novo endereço/ }),
      'prefeitura-de-sao-jose',
    )
    await usuario.click(screen.getByRole('button', { name: 'Confirmar troca' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('/provedores/prefeitura-de-sao-jose')
    expect(aviso).toHaveTextContent(/continuam funcionando por redirecionamento automático/)
  })
})
