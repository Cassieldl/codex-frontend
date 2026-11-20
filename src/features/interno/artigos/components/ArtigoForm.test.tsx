import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ArtigoAdminDetalhe } from '../types/artigoAdmin'
import type { BuscaDeErrosDoArtigo, CamposLayoutDoArtigo } from '../types/referenciasArtigo'
import type { ArtigoFormProps } from './ArtigoForm'
import { ArtigoForm } from './ArtigoForm'

const CAMPO_DISCRIMINACAO = {
  id: 3,
  nome: 'Discriminacao',
  caminhoXml: 'Rps/Discriminacao',
  versaoLayoutId: 2,
  versaoLayoutRotulo: '7',
  desativado: false,
}

const CAMPO_CODIGO_SERVICO = {
  ...CAMPO_DISCRIMINACAO,
  id: 8,
  nome: 'CodigoServico',
  caminhoXml: 'Servico/CodigoServico',
}

const ARTIGO: ArtigoAdminDetalhe = {
  id: 42,
  slug: 'migrar-para-abrasf-204',
  tipo: 'Conceito',
  titulo: 'Migrar para ABRASF 2.04',
  corpo: '## Antes de comecar\n\nConfira a versao do provedor.',
  publicado: false,
  reservado: false,
  verificadoEm: null,
  campoLayoutIds: [3],
  erroIds: [],
  erros: [],
  camposLayout: [CAMPO_DISCRIMINACAO],
  versaoConcorrencia: 7,
  etag: 'W/"7"',
}

const BUSCA_DE_ERROS: BuscaDeErrosDoArtigo = {
  termo: '',
  onTermoChange: vi.fn(),
  resultados: [{ id: 17, codigo: 'E0117', titulo: 'RPS invalido', desativado: false }],
  totalEncontrado: 1,
  isBuscando: false,
  isError: false,
}

const CAMPOS_LAYOUT: CamposLayoutDoArtigo = {
  versoes: [{ id: 2, rotulo: '7' }],
  versaoSelecionadaId: 2,
  onVersaoChange: vi.fn(),
  campos: [CAMPO_DISCRIMINACAO, CAMPO_CODIGO_SERVICO],
  isLoading: false,
  isError: false,
}

function renderizar(props: Partial<React.ComponentProps<typeof ArtigoForm>> = {}) {
  const onSubmit = vi.fn<ArtigoFormProps['onSubmit']>()
  render(
    <ArtigoForm
      buscaDeErros={BUSCA_DE_ERROS}
      camposLayout={CAMPOS_LAYOUT}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      {...props}
    />,
  )
  return { onSubmit }
}

describe('ArtigoForm', () => {
  it('alterna editar/pré-visualizar renderizando o Markdown do que está no textarea', async () => {
    const usuario = userEvent.setup()
    renderizar({ initialData: ARTIGO })

    expect(screen.getByRole('textbox', { name: /Corpo/ })).toHaveValue(ARTIGO.corpo)

    await usuario.click(screen.getByRole('tab', { name: 'Pré-visualizar' }))

    // `## Antes de comecar` vira <h2> de verdade - é o mesmo renderizador da
    // página pública, não um <pre> com o texto cru.
    expect(screen.getByRole('heading', { level: 2, name: 'Antes de comecar' })).toBeInTheDocument()
  })

  it('a pré-visualização acompanha o que foi digitado, sem salvar', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.type(screen.getByRole('textbox', { name: /Corpo/ }), '### Passo a passo')
    await usuario.click(screen.getByRole('tab', { name: 'Pré-visualizar' }))

    expect(screen.getByRole('heading', { level: 3, name: 'Passo a passo' })).toBeInTheDocument()
  })

  it('título e corpo vazios bloqueiam o envio com mensagem em português', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('O título é obrigatório.')).toBeInTheDocument()
    expect(screen.getByText('O corpo do artigo é obrigatório.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia tipo no valor de contrato ASCII e normaliza as referências para number[]', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar({ initialData: ARTIGO })

    // Rótulo visível com acento, valor de contrato sem - M-5.
    await usuario.click(screen.getByRole('combobox', { name: /Tipo/ }))
    await usuario.click(screen.getByRole('option', { name: 'Mudança/Migração' }))

    await usuario.click(screen.getByRole('checkbox', { name: /CodigoServico/ }))
    await usuario.click(screen.getByRole('checkbox', { name: /E0117/ }))
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      titulo: ARTIGO.titulo,
      tipo: 'Mudanca',
      corpo: ARTIGO.corpo,
      campoLayoutIds: [3, 8],
      erroIds: [17],
    })
  })

  it('nunca manda slug nem publicado no payload - derivados/alterados só no servidor', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar({ initialData: ARTIGO })

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const enviado = onSubmit.mock.calls[0][0]
    expect(enviado).not.toHaveProperty('slug')
    expect(enviado).not.toHaveProperty('publicado')
    expect(screen.queryByLabelText(/Slug/)).not.toBeInTheDocument()
  })

  it('artigo reservado explica a reserva no próprio formulário', () => {
    renderizar({ initialData: { ...ARTIGO, reservado: true } })

    expect(screen.getByRole('status')).toHaveTextContent(/não pode ser removido nem despublicado/i)
  })

  it('a sugestão pré-preenche título e tipo na criação', () => {
    renderizar({ sugestao: { titulo: 'Como funciona', tipo: 'Conceito' } })

    expect(screen.getByRole('textbox', { name: /Título/ })).toHaveValue('Como funciona')
    expect(screen.getByRole('combobox', { name: /Tipo/ })).toHaveTextContent('Conceito')
  })
})

describe('ArtigoForm: vínculos', () => {
  it('Enter na busca de erros não envia o formulário', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar({ initialData: ARTIGO })

    await usuario.type(screen.getByRole('searchbox', { name: /Buscar erro/ }), 'E01{Enter}')

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('id gravado sem rótulo na resposta continua à vista e no envio', async () => {
    const usuario = userEvent.setup()
    const { onSubmit } = renderizar({ initialData: { ...ARTIGO, erroIds: [55], erros: [] } })

    expect(screen.getByRole('list', { name: 'Erros vinculados' })).toHaveTextContent('Erro 55')

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ erroIds: [55], campoLayoutIds: [3] })
  })
})
