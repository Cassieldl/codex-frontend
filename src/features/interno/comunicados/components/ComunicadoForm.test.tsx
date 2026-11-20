import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../../../test/mocks/server'
import type { ComunicadoAdminDetalhe, ComunicadoFormDto } from '../types/comunicadoAdmin'
import { ComunicadoForm, type OpcaoProvedorComunicado } from './ComunicadoForm'

const API_URL = import.meta.env.VITE_API_URL

const PROVEDORES: OpcaoProvedorComunicado[] = [
  { id: 4, nome: 'Prefeitura de Exemplo' },
  { id: 5, nome: 'Prefeitura Vizinha' },
]

/** `GET /interno/provedores/{id}/versoes` (I6) - `ApiResponse<T[]>` enveloped. */
function handlerVersoes(provedorId: number, versoes: { id: number; rotulo: string }[]) {
  return http.get(`${API_URL}/interno/provedores/${provedorId}/versoes`, () =>
    HttpResponse.json({
      data: versoes.map((versao) => ({
        ...versao,
        verificadoEm: null,
        publicado: true,
        versaoConcorrencia: 1,
      })),
      message: null,
    }),
  )
}

function renderizar(props: Partial<React.ComponentProps<typeof ComunicadoForm>> = {}): {
  onSubmit: ReturnType<typeof vi.fn>
} {
  const onSubmit = vi.fn<(dto: ComunicadoFormDto) => void>()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  render(
    <ComunicadoForm
      opcoesProvedores={PROVEDORES}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      {...props}
    />,
    { wrapper: Wrapper },
  )

  return { onSubmit }
}

async function escolher(rotuloDoSelect: RegExp, rotuloDaOpcao: string) {
  const usuario = userEvent.setup()
  const combobox = screen.getByRole('combobox', { name: rotuloDoSelect })
  await usuario.click(combobox)
  const listbox = await screen.findByRole('listbox', { name: rotuloDoSelect })
  await usuario.click(within(listbox).getByRole('option', { name: rotuloDaOpcao }))
}

/** Datas fixas fora de qualquer ambiguidade de "hoje": uma no futuro, outra no passado. */
const FUTURO = '2099-06-01T10:00'
const PASSADO = '2001-06-01T10:00'

async function preencherBasico(expiraEm = FUTURO) {
  const usuario = userEvent.setup()
  await usuario.type(screen.getByLabelText(/título/i), 'Instabilidade na SEFIN')
  await usuario.type(screen.getByLabelText(/corpo/i), 'Emissões podem demorar até as 18h.')
  await usuario.type(screen.getByLabelText(/expira em/i), expiraEm)
}

describe('ComunicadoForm: estrutura decidida pela abrangência', () => {
  it('abrangência Global não renderiza provedor nem versão', () => {
    renderizar()

    expect(screen.queryByRole('combobox', { name: /provedor/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /versão/i })).not.toBeInTheDocument()
  })

  it('abrangência Provedor mostra provedor e segue sem versão', async () => {
    renderizar()

    await escolher(/abrangência/i, 'Um provedor inteiro')

    expect(await screen.findByRole('combobox', { name: /provedor/i })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /^versão/i })).not.toBeInTheDocument()
  })

  it('abrangência ProvedorVersao mostra os dois campos', async () => {
    renderizar()

    await escolher(/abrangência/i, 'Uma versão de um provedor')

    expect(await screen.findByRole('combobox', { name: /provedor/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /^versão/i })).toBeInTheDocument()
  })
})

describe('ComunicadoForm: consistência de escopo no envio', () => {
  it('Global envia provedorId e versaoProvedorId como undefined', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    await preencherBasico()
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const dto = onSubmit.mock.calls[0][0] as ComunicadoFormDto
    expect(dto.abrangencia).toBe('Global')
    expect(dto.provedorId).toBeUndefined()
    expect(dto.versaoProvedorId).toBeUndefined()
  })

  it('Provedor envia provedorId numérico e nenhuma versão', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    await preencherBasico()
    await escolher(/abrangência/i, 'Um provedor inteiro')
    await escolher(/provedor/i, 'Prefeitura Vizinha')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const dto = onSubmit.mock.calls[0][0] as ComunicadoFormDto
    expect(dto.provedorId).toBe(5)
    expect(dto.versaoProvedorId).toBeUndefined()
  })

  it('ProvedorVersao envia os dois ids', async () => {
    server.use(handlerVersoes(4, [{ id: 9, rotulo: 'ABRASF 2.04' }]))
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    await preencherBasico()
    await escolher(/abrangência/i, 'Uma versão de um provedor')
    await escolher(/provedor/i, 'Prefeitura de Exemplo')
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /^versão/i })).not.toBeDisabled(),
    )
    await escolher(/^versão/i, 'ABRASF 2.04')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const dto = onSubmit.mock.calls[0][0] as ComunicadoFormDto
    expect(dto.provedorId).toBe(4)
    expect(dto.versaoProvedorId).toBe(9)
  })

  it('sem provedor, a abrangência Provedor bloqueia o submit com mensagem em português', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    await preencherBasico()
    await escolher(/abrangência/i, 'Um provedor inteiro')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Selecione o provedor.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('com provedor mas sem versão, ProvedorVersao bloqueia o submit', async () => {
    server.use(handlerVersoes(4, [{ id: 9, rotulo: 'ABRASF 2.04' }]))
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    await preencherBasico()
    await escolher(/abrangência/i, 'Uma versão de um provedor')
    await escolher(/provedor/i, 'Prefeitura de Exemplo')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Selecione a versão.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('trocar de provedor limpa a versão já escolhida', async () => {
    server.use(
      handlerVersoes(4, [{ id: 9, rotulo: 'ABRASF 2.04' }]),
      handlerVersoes(5, [{ id: 21, rotulo: 'Padrão próprio 1.0' }]),
    )
    renderizar()

    await escolher(/abrangência/i, 'Uma versão de um provedor')
    await escolher(/provedor/i, 'Prefeitura de Exemplo')
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /^versão/i })).not.toBeDisabled(),
    )
    await escolher(/^versão/i, 'ABRASF 2.04')
    expect(screen.getByRole('combobox', { name: /^versão/i })).toHaveTextContent('ABRASF 2.04')

    await escolher(/provedor/i, 'Prefeitura Vizinha')

    // A versão do provedor anterior não pode sobreviver à troca: submeter
    // "Prefeitura Vizinha + ABRASF 2.04 do vizinho errado" seria uma
    // combinação que não existe no banco.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /^versão/i })).not.toHaveTextContent(
        'ABRASF 2.04',
      ),
    )
  })

  it('voltar para Global descarta o provedor que já tinha sido escolhido', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    await preencherBasico()
    await escolher(/abrangência/i, 'Um provedor inteiro')
    await escolher(/provedor/i, 'Prefeitura de Exemplo')
    await escolher(/abrangência/i, 'Todo o portal')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const dto = onSubmit.mock.calls[0][0] as ComunicadoFormDto
    expect(dto.abrangencia).toBe('Global')
    expect(dto.provedorId).toBeUndefined()
  })
})

describe('ComunicadoForm: expiração obrigatória e no futuro (M-3)', () => {
  it('sem expiração, bloqueia o submit', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    await usuario.type(screen.getByLabelText(/título/i), 'Instabilidade na SEFIN')
    await usuario.type(screen.getByLabelText(/corpo/i), 'Emissões podem demorar até as 18h.')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('A data de expiração é obrigatória.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('expiração no passado bloqueia o submit com mensagem em português', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    await preencherBasico(PASSADO)
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('A expiração precisa ser no futuro.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('a regra do futuro vale também na edição, não só na criação', async () => {
    const usuario = userEvent.setup()
    const encerrado: ComunicadoAdminDetalhe = {
      id: 3,
      titulo: 'Comunicado já encerrado',
      corpo: 'Este já venceu.',
      severidade: 'Alerta',
      abrangencia: 'Global',
      provedorId: null,
      provedorNome: null,
      versaoProvedorId: null,
      versaoRotulo: null,
      expiraEm: '2001-06-01T10:00:00+00:00',
      publicado: false,
      encerrado: true,
      versaoConcorrencia: 2,
    }
    const { onSubmit } = renderizar({ initialData: encerrado })

    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('A expiração precisa ser no futuro.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia expiraEm em ISO-8601, não no formato do campo datetime-local', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    await preencherBasico()
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const dto = onSubmit.mock.calls[0][0] as ComunicadoFormDto
    expect(dto.expiraEm).toBe(new Date(FUTURO).toISOString())
    expect(dto.expiraEm).not.toBe(FUTURO)
  })
})

describe('ComunicadoForm: limite de corpo (B-6)', () => {
  it('2000 caracteres passam; 2001 reprovam com mensagem em português', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    // `paste` em vez de `type`: 2000 teclas simuladas levariam minutos.
    await usuario.type(screen.getByLabelText(/título/i), 'Limite de corpo')
    await usuario.type(screen.getByLabelText(/expira em/i), FUTURO)

    const corpo = screen.getByLabelText(/corpo/i)
    await usuario.click(corpo)
    await usuario.paste('a'.repeat(2000))
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    await usuario.click(corpo)
    await usuario.paste('a')
    await usuario.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Máximo de 2000 caracteres.')).toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('ComunicadoForm: edição a partir do detalhe (I31)', () => {
  it('pré-preenche corpo e escopo com os campos que só o detalhe tem', async () => {
    server.use(handlerVersoes(4, [{ id: 9, rotulo: 'ABRASF 2.04' }]))
    const detalhe: ComunicadoAdminDetalhe = {
      id: 77,
      titulo: 'Manutenção programada',
      corpo: 'A prefeitura ficará indisponível no domingo.',
      severidade: 'Critico',
      abrangencia: 'ProvedorVersao',
      provedorId: 4,
      provedorNome: 'Prefeitura de Exemplo',
      versaoProvedorId: 9,
      versaoRotulo: 'ABRASF 2.04',
      expiraEm: '2099-05-20T09:00:00+00:00',
      publicado: true,
      encerrado: false,
      versaoConcorrencia: 31,
    }

    renderizar({ initialData: detalhe })

    expect(screen.getByLabelText(/corpo/i)).toHaveValue(
      'A prefeitura ficará indisponível no domingo.',
    )
    expect(screen.getByRole('combobox', { name: /provedor/i })).toHaveTextContent(
      'Prefeitura de Exemplo',
    )
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /^versão/i })).toHaveTextContent('ABRASF 2.04'),
    )
  })
})
