import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../../../test/mocks/server'
import { BarraDeComando } from './BarraDeComando'

const API_URL = import.meta.env.VITE_API_URL

// JSON literal transcrito de BuscaItemDto, sem o tipo do cliente.
const ITEM_BASE = {
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
}

function criarItem(sobrescritas: Partial<typeof ITEM_BASE>) {
  return { ...ITEM_BASE, ...sobrescritas }
}

const PRIMEIRO = criarItem({ titulo: 'Primeiro resultado', url: '/erros/primeiro' })
const SEGUNDO = criarItem({ titulo: 'Segundo resultado', url: '/erros/segundo' })
const TERCEIRO = criarItem({
  tipo: 'artigo',
  titulo: 'Terceiro resultado',
  url: '/artigos/terceiro',
  publicado: false,
})

/** Resposta de I21 no shape real - `ApiResponse<ResultadoBusca>`, dois grupos. */
function handlerBuscaInterna(itens = [PRIMEIRO, SEGUNDO, TERCEIRO]) {
  const resultado = {
    termo: 'rps',
    termoUsado: 'rps',
    correcao: null,
    qualidade: 'exata',
    totalGeral: itens.length,
    grupos: [
      {
        tipo: 'erro',
        rotulo: 'Erros',
        total: itens.filter((item) => item.tipo === 'erro').length,
        pontuacao: 2,
        itens: itens.filter((item) => item.tipo === 'erro'),
      },
      {
        tipo: 'artigo',
        rotulo: 'Artigos',
        total: itens.filter((item) => item.tipo === 'artigo').length,
        pontuacao: 1,
        itens: itens.filter((item) => item.tipo === 'artigo'),
      },
    ],
    foraDoFiltro: null,
    filtroProvedor: null,
  }

  return http.get(`${API_URL}/interno/busca`, () =>
    HttpResponse.json({ data: resultado, message: null }),
  )
}

function renderizar(props: Partial<React.ComponentProps<typeof BarraDeComando>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  const aoNavegar = vi.fn()
  render(<BarraDeComando aoNavegar={aoNavegar} {...props} />, { wrapper: Wrapper })
  return { aoNavegar }
}

// `userEvent.setup()` sobrescreve `navigator.clipboard` - espionar só depois
// dele (AP-FRONTEND-020).
function configurarUsuarioComClipboard() {
  const usuario = userEvent.setup()
  const escreverNaAreaDeTransferencia = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined)
  return { usuario, escreverNaAreaDeTransferencia }
}

async function abrirComResultados(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('button', { name: /Abrir busca rápida/ }))
  await usuario.type(screen.getByRole('combobox', { name: /Buscar no Codex/ }), 'rps')
  await screen.findByText('Primeiro resultado')
}

describe('BarraDeComando: abertura e fechamento', () => {
  it('Ctrl+K e Cmd+K abrem o diálogo de qualquer lugar da área interna', async () => {
    renderizar()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('o atalho não dispara com o foco num campo de formulário aberto', async () => {
    renderizar()

    const formulario = document.createElement('form')
    const campo = document.createElement('input')
    formulario.appendChild(campo)
    document.body.appendChild(formulario)
    campo.focus()

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    formulario.remove()
  })

  it('o diálogo é nomeado sem ocupar o lugar do campo de busca', async () => {
    renderizar()

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveAccessibleName('Busca rápida')
    expect(screen.getByRole('heading', { name: 'Busca rápida' })).toHaveClass('sr-only')
    expect(screen.getByRole('combobox', { name: /Buscar no Codex/ })).toHaveFocus()
  })
})

describe('BarraDeComando: navegação por teclado', () => {
  it('↑/↓ movem o aria-activedescendant sobre a lista plana dos três resultados', async () => {
    server.use(handlerBuscaInterna())
    const usuario = userEvent.setup()
    renderizar()

    await abrirComResultados(usuario)

    const campo = screen.getByRole('combobox', { name: /Buscar no Codex/ })
    const opcoes = screen.getAllByRole('option')
    expect(opcoes).toHaveLength(3)

    function ativa() {
      const id = campo.getAttribute('aria-activedescendant')
      return screen.getAllByRole('option').find((opcao) => opcao.id === id)
    }

    // Três itens e ordem esperada que não coincide com a inversa: começa no
    // primeiro, desce dois, dá a volta e sobe um.
    expect(ativa()).toHaveTextContent('Primeiro resultado')

    await usuario.keyboard('{ArrowDown}')
    expect(ativa()).toHaveTextContent('Segundo resultado')

    await usuario.keyboard('{ArrowDown}')
    expect(ativa()).toHaveTextContent('Terceiro resultado')

    await usuario.keyboard('{ArrowDown}')
    expect(ativa()).toHaveTextContent('Primeiro resultado')

    await usuario.keyboard('{ArrowUp}')
    expect(ativa()).toHaveTextContent('Terceiro resultado')
  })

  it('só uma opção fica selecionada por vez', async () => {
    server.use(handlerBuscaInterna())
    const usuario = userEvent.setup()
    renderizar()

    await abrirComResultados(usuario)
    await usuario.keyboard('{ArrowDown}')

    const selecionadas = screen
      .getAllByRole('option')
      .filter((opcao) => opcao.getAttribute('aria-selected') === 'true')

    expect(selecionadas).toHaveLength(1)
    expect(selecionadas[0]).toHaveTextContent('Segundo resultado')
  })

  it('Enter abre o item ativo e fecha a paleta', async () => {
    server.use(handlerBuscaInterna())
    const usuario = userEvent.setup()
    const { aoNavegar } = renderizar()

    await abrirComResultados(usuario)
    await usuario.keyboard('{ArrowDown}')
    await usuario.keyboard('{Enter}')

    expect(aoNavegar).toHaveBeenCalledWith('/erros/segundo')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('Enter num item em rascunho leva à tela de edição, nunca à URL pública', async () => {
    server.use(handlerBuscaInterna())
    const usuario = userEvent.setup()
    const { aoNavegar } = renderizar()

    await abrirComResultados(usuario)
    await usuario.keyboard('{ArrowUp}')
    await usuario.keyboard('{Enter}')

    expect(aoNavegar).toHaveBeenCalledWith('/interno/artigos')
  })
})

describe('BarraDeComando: Ctrl+Enter copia sem fechar', () => {
  it('copia o link público do item ativo e mantém o diálogo aberto', async () => {
    server.use(handlerBuscaInterna())
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    const { aoNavegar } = renderizar()

    await abrirComResultados(usuario)
    await usuario.keyboard('{Control>}{Enter}{/Control}')

    await waitFor(() =>
      expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
        `${window.location.origin}/erros/primeiro?origem=atendimento`,
      ),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(aoNavegar).not.toHaveBeenCalled()
    expect(await screen.findByText('Link copiado.')).toBeInTheDocument()
  })

  it('no item em rascunho copia o link interno e diz que foi o interno', async () => {
    server.use(handlerBuscaInterna())
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    renderizar()

    await abrirComResultados(usuario)
    await usuario.keyboard('{ArrowUp}')
    await usuario.keyboard('{Control>}{Enter}{/Control}')

    await waitFor(() =>
      expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith(
        `${window.location.origin}/interno/artigos?origem=atendimento`,
      ),
    )
    expect(await screen.findByText('Link interno copiado.')).toBeInTheDocument()
  })

  it('cópia recusada pelo navegador avisa a falha e não deixa promessa rejeitada solta', async () => {
    server.use(handlerBuscaInterna())
    const { usuario, escreverNaAreaDeTransferencia } = configurarUsuarioComClipboard()
    escreverNaAreaDeTransferencia.mockRejectedValue(new DOMException('negado', 'NotAllowedError'))
    renderizar()

    await abrirComResultados(usuario)
    await usuario.keyboard('{Control>}{Enter}{/Control}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível copiar o link.')
    expect(screen.queryByText('Link copiado.')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Rejeição solta não aparece aqui: o Vitest a reporta como erro e a execução sai com código 1.
  })
})

describe('BarraDeComando: estados da busca', () => {
  it('antes do termo mínimo, orienta em vez de mostrar lista vazia', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole('button', { name: /Abrir busca rápida/ }))

    expect(screen.getByText(/Digite ao menos 2 caracteres/)).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('busca sem resultado tem texto próprio, e o contador é anunciado', async () => {
    server.use(handlerBuscaInterna([]))
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole('button', { name: /Abrir busca rápida/ }))
    await usuario.type(screen.getByRole('combobox', { name: /Buscar no Codex/ }), 'rps')

    expect(
      await screen.findByText('O Codex ainda não documenta esta rejeição.'),
    ).toBeInTheDocument()
    expect(screen.getByText('0 resultados')).toBeInTheDocument()
  })

  it('com resultados, o contador anunciado acompanha a lista', async () => {
    server.use(handlerBuscaInterna())
    const usuario = userEvent.setup()
    renderizar()

    await abrirComResultados(usuario)

    expect(screen.getByText('3 resultados')).toBeInTheDocument()
  })

  it('erro de rede mostra o retry e o contador anunciado não mente "0 resultados"', async () => {
    // Mesmo hook e mesmo padrão do bloco de erro da tela 11 (`inicio.test.tsx`): sem a guarda
    // `!isError`, o leitor de tela ouviria "0 resultados" quando a busca falhou - a versão em
    // áudio da mesma mentira que o texto já cometia antes de existir `ErrorState`.
    server.use(
      http.get(`${API_URL}/interno/busca`, () =>
        HttpResponse.json(
          { error: { code: 'ERRO_INTERNO', message: 'Erro interno.' } },
          { status: 500 },
        ),
      ),
    )
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole('button', { name: /Abrir busca rápida/ }))
    await usuario.type(screen.getByRole('combobox', { name: /Buscar no Codex/ }), 'rps')

    expect(await screen.findByText('Não foi possível buscar agora.')).toBeInTheDocument()

    const contador = document.querySelector('[aria-live="polite"]')
    expect(contador).not.toBeNull()
    expect(contador).not.toHaveTextContent('resultados')
  })
})
