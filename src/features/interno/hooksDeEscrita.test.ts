import { QueryClient, QueryClientProvider, type QueryKey } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  artigoAdminDto,
  avisoAdminDto,
  campoLayoutResponseDto,
  campoVersaoAdminDto,
  comunicadoAdminDto,
  erroAdminDetalheDto,
  exemploAdminDto,
  provedorAdminDetalheDto,
  versaoAdminDetalheDto,
  versaoLayoutAdminDto,
} from '../../test/mocks/respostasEscritaInterna'
import { server } from '../../test/mocks/server'
import { artigosAdminKeys } from './artigos/hooks/artigosAdminKeys'
import { useAtualizarArtigo } from './artigos/hooks/useAtualizarArtigo'
import { useCriarArtigo } from './artigos/hooks/useCriarArtigo'
import { usePublicarArtigo } from './artigos/hooks/usePublicarArtigo'
import { useRemoverArtigo } from './artigos/hooks/useRemoverArtigo'
import { useVerificarArtigo } from './artigos/hooks/useVerificarArtigo'
import { camposLayoutKeys } from './camposLayout/hooks/camposLayoutKeys'
import { useAtualizarCampoLayout } from './camposLayout/hooks/useAtualizarCampoLayout'
import { useAtualizarVersaoLayout } from './camposLayout/hooks/useAtualizarVersaoLayout'
import { useCriarCampoLayout } from './camposLayout/hooks/useCriarCampoLayout'
import { useCriarVersaoLayout } from './camposLayout/hooks/useCriarVersaoLayout'
import { useRemoverCampoLayout } from './camposLayout/hooks/useRemoverCampoLayout'
import { versoesLayoutKeys } from './camposLayout/hooks/versoesLayoutKeys'
import { comunicadosAdminKeys } from './comunicados/hooks/comunicadosAdminKeys'
import { useAtualizarComunicado } from './comunicados/hooks/useAtualizarComunicado'
import { useCriarComunicado } from './comunicados/hooks/useCriarComunicado'
import { usePublicarComunicado } from './comunicados/hooks/usePublicarComunicado'
import { useRemoverComunicado } from './comunicados/hooks/useRemoverComunicado'
import { errosAdminKeys } from './erros/hooks/errosAdminKeys'
import { useAtualizarErro } from './erros/hooks/useAtualizarErro'
import { useCriarErro } from './erros/hooks/useCriarErro'
import { useRemoverErro } from './erros/hooks/useRemoverErro'
import { exemplosAdminKeys } from './exemplos/hooks/exemplosAdminKeys'
import { useAtualizarExemplo } from './exemplos/hooks/useAtualizarExemplo'
import { useCriarExemplo } from './exemplos/hooks/useCriarExemplo'
import { useRemoverExemplo } from './exemplos/hooks/useRemoverExemplo'
import { usePublicarAviso } from './hooks/usePublicarAviso'
import { usePublicarCampoLayout } from './hooks/usePublicarCampoLayout'
import { usePublicarErro } from './hooks/usePublicarErro'
import { usePublicarProvedor } from './hooks/usePublicarProvedor'
import { usePublicarVersaoLayout } from './hooks/usePublicarVersaoLayout'
import { usePublicarVersaoProvedor } from './hooks/usePublicarVersaoProvedor'
import { camposVersaoKeys } from './provedores/hooks/camposVersaoKeys'
import { provedoresAdminKeys } from './provedores/hooks/provedoresAdminKeys'
import { useAtualizarAviso } from './provedores/hooks/useAtualizarAviso'
import { useAtualizarCampoVersao } from './provedores/hooks/useAtualizarCampoVersao'
import { useAtualizarProvedor } from './provedores/hooks/useAtualizarProvedor'
import { useAtualizarVersaoProvedor } from './provedores/hooks/useAtualizarVersaoProvedor'
import { useTrocarSlugProvedor } from './provedores/hooks/useTrocarSlugProvedor'
import { useCriarAvisoProvedor } from './provedores/hooks/useCriarAvisoProvedor'
import { useCriarAvisoVersao } from './provedores/hooks/useCriarAvisoVersao'
import { useCriarCampoVersao } from './provedores/hooks/useCriarCampoVersao'
import { useCriarProvedor } from './provedores/hooks/useCriarProvedor'
import { useCriarVersaoProvedor } from './provedores/hooks/useCriarVersaoProvedor'
import { useRemoverAviso } from './provedores/hooks/useRemoverAviso'
import { useRemoverCampoVersao } from './provedores/hooks/useRemoverCampoVersao'
import { useVerificarVersao } from './provedores/hooks/useVerificarVersao'
import { versoesAdminKeys } from './provedores/hooks/versoesAdminKeys'
import { verificacoesVencidasKeys } from './verificacoesVencidas/hooks/verificacoesVencidasKeys'

// O `If-Match` esperado sai do verbo: todo PUT e DELETE interno chama `ExigirIfMatch()`, nenhum POST.

const API_URL = import.meta.env.VITE_API_URL
const PREFIXO_INTERNO = `${new URL(API_URL).pathname}/interno`
const ETAG = 'W/"31"'
const CHAVE_FORA_DO_ESCOPO = ['consultaQueNenhumaEscritaToca'] as const

type Verbo = 'POST' | 'PUT' | 'DELETE'

interface Esperado {
  verbo: Verbo
  rota: string
  corpo?: unknown
  devolve?: unknown
  mensagem?: string
  retorno?: unknown
  invalida: QueryKey[]
  /** O que o `409 CONFLITO_CONCORRENCIA` relê, quando difere do sucesso. */
  invalidaNoConflito?: QueryKey[]
}

interface CasoDeEscrita {
  nome: string
  hook: unknown
  esperado: Esperado
  executar: (queryClient: QueryClient) => Promise<unknown>
}

interface MutacaoDoHook<TVariaveis> {
  mutateAsync: (variaveis: TVariaveis) => Promise<unknown>
}

interface RequisicaoCapturada {
  verbo: string
  rota: string
  corpo: unknown
  ifMatch: string | null
}

function criarWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function caso<TArgs extends unknown[], TVariaveis>(
  nome: string,
  hook: (...args: TArgs) => MutacaoDoHook<TVariaveis>,
  args: NoInfer<TArgs>,
  variaveis: NoInfer<TVariaveis>,
  esperado: Esperado,
): CasoDeEscrita {
  return {
    nome,
    hook,
    esperado,
    executar: async (queryClient) => {
      const { result } = renderHook(() => hook(...args), { wrapper: criarWrapper(queryClient) })
      let retorno: unknown
      await act(async () => {
        retorno = await result.current.mutateAsync(variaveis)
      })
      return retorno
    },
  }
}

function responder({ verbo, devolve, mensagem }: Esperado) {
  if (verbo === 'DELETE') return new HttpResponse(null, { status: 204 })
  return HttpResponse.json(
    { data: devolve, message: mensagem ?? null },
    { status: verbo === 'POST' ? 201 : 200 },
  )
}

async function verificarContrato({ esperado, executar }: CasoDeEscrita) {
  const capturadas: RequisicaoCapturada[] = []
  server.use(
    http.all(`${API_URL}/interno/*`, async ({ request }) => {
      const texto = await request.text()
      capturadas.push({
        verbo: request.method,
        rota: new URL(request.url).pathname.slice(PREFIXO_INTERNO.length),
        corpo: texto === '' ? null : JSON.parse(texto),
        ifMatch: request.headers.get('If-Match'),
      })
      return responder(esperado)
    }),
  )

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  for (const chave of [...esperado.invalida, CHAVE_FORA_DO_ESCOPO]) {
    queryClient.setQueryData(chave, 'em cache')
  }

  const retorno = await executar(queryClient)

  expect(capturadas).toEqual([
    {
      verbo: esperado.verbo,
      rota: esperado.rota,
      corpo: esperado.corpo ?? null,
      ifMatch: esperado.verbo === 'POST' ? null : ETAG,
    },
  ])
  expect(retorno).toEqual('retorno' in esperado ? esperado.retorno : esperado.devolve)

  // O mutateAsync só resolve depois do onSuccess/onSettled do hook, então a marca já está posta.
  expect(
    esperado.invalida.map((chave) => [chave, queryClient.getQueryState(chave)?.isInvalidated]),
  ).toEqual(esperado.invalida.map((chave) => [chave, true]))
  expect(queryClient.getQueryState(CHAVE_FORA_DO_ESCOPO)?.isInvalidated).toBe(false)
}

/** Sem a releitura, a página segue com o etag velho e a segunda tentativa leva outro 409. */
async function verificarReleituraNoConflito({ esperado, executar }: CasoDeEscrita) {
  server.use(
    http.all(`${API_URL}/interno/*`, () =>
      HttpResponse.json(
        {
          error: {
            code: 'CONFLITO_CONCORRENCIA',
            message: 'O registro foi alterado por outra requisição. Recarregue e tente novamente.',
          },
        },
        { status: 409 },
      ),
    ),
  )

  const relidas = esperado.invalidaNoConflito ?? esperado.invalida
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  for (const chave of [...relidas, CHAVE_FORA_DO_ESCOPO]) {
    queryClient.setQueryData(chave, 'em cache')
  }

  await expect(executar(queryClient)).rejects.toMatchObject({ response: { status: 409 } })

  expect(relidas.map((chave) => [chave, queryClient.getQueryState(chave)?.isInvalidated])).toEqual(
    relidas.map((chave) => [chave, true]),
  )
  expect(queryClient.getQueryState(CHAVE_FORA_DO_ESCOPO)?.isInvalidated).toBe(false)
}

const erroAtualizacao = {
  origem: 'Prefeitura' as const,
  titulo: 'RPS invalido',
  causaProvavel: 'Discriminacao vazia.',
  solucaoSugerida: 'Preencha a discriminacao do servico.',
  variantes: ['RPS invalido ou incompleto'],
  versoesProvedorIds: [5],
  camposLayoutIds: [3],
}

const erroForm = { codigo: 'E0117', ...erroAtualizacao }

const artigoForm = {
  titulo: 'Migrar para ABRASF 2.04',
  tipo: 'Mudanca' as const,
  corpo: '## Antes de comecar',
  campoLayoutIds: [3],
  erroIds: [17],
}

const comunicadoForm = {
  titulo: 'Janela de manutencao',
  corpo: 'O emissor fica fora do ar no domingo de madrugada.',
  severidade: 'Alerta' as const,
  abrangencia: 'Global' as const,
  expiraEm: '2026-12-31T23:59:00-03:00',
}

const campoVersaoAtualizacao = {
  tipo: 'Texto',
  tamanho: '2000',
  estadoPreenchimento: 'Obrigatorio' as const,
  exemplo: 'Servico prestado',
  destinoXml: 'Rps/Discriminacao',
  ordem: 1,
}

const campoVersaoForm = { campoLayoutId: 3, ...campoVersaoAtualizacao }

const avisoForm = {
  severidade: 'Alerta' as const,
  titulo: 'Instabilidade no webservice',
  corpo: 'O ambiente de homologação recusa lotes acima de 50 RPS.',
  vigenciaInicio: '2026-09-01',
}

const exemploForm = {
  nome: 'RPS minimo',
  xml: '<Rps><Discriminacao>Servico prestado</Discriminacao></Rps>',
}

const PUBLICAR: CasoDeEscrita[] = [
  caso(
    'usePublicarProvedor',
    usePublicarProvedor,
    [],
    { id: 42, publicado: true, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/provedores/42/publicacao',
      corpo: { publicado: true },
      devolve: provedorAdminDetalheDto,
      invalida: [provedoresAdminKeys.all],
    },
  ),
  caso(
    'usePublicarVersaoProvedor',
    usePublicarVersaoProvedor,
    [],
    { id: 5, publicado: true, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/versoes/5/publicacao',
      corpo: { publicado: true },
      devolve: versaoAdminDetalheDto,
      invalida: [versoesAdminKeys.all],
    },
  ),
  caso(
    'usePublicarVersaoLayout',
    usePublicarVersaoLayout,
    [],
    { id: 2, publicado: false, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/layout/versoes/2/publicacao',
      corpo: { publicado: false },
      devolve: versaoLayoutAdminDto,
      invalida: [versoesLayoutKeys.all],
    },
  ),
  caso(
    'usePublicarCampoLayout',
    usePublicarCampoLayout,
    [],
    { id: 3, publicado: true, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/campos-layout/3/publicacao',
      corpo: { publicado: true },
      devolve: campoLayoutResponseDto,
      invalida: [camposLayoutKeys.all],
    },
  ),
  caso(
    'usePublicarErro',
    usePublicarErro,
    [],
    { id: 17, publicado: true, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/erros/17/publicacao',
      corpo: { publicado: true },
      devolve: erroAdminDetalheDto,
      invalida: [errosAdminKeys.all],
    },
  ),
  caso(
    'usePublicarArtigo',
    usePublicarArtigo,
    [],
    { id: 23, publicado: true, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/artigos/23/publicacao',
      corpo: { publicado: true },
      devolve: artigoAdminDto,
      invalida: [artigosAdminKeys.all],
    },
  ),
  caso(
    'usePublicarComunicado',
    usePublicarComunicado,
    [],
    { id: 61, publicado: false, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/comunicados/61/publicacao',
      corpo: { publicado: false },
      devolve: comunicadoAdminDto,
      invalida: [comunicadosAdminKeys.all],
    },
  ),
  // Aviso não tem query própria: invalida o detalhe do pai, que quem chama informa.
  caso(
    'usePublicarAviso',
    usePublicarAviso,
    [provedoresAdminKeys.detail(42)],
    { id: 9, publicado: true, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/avisos/9/publicacao',
      corpo: { publicado: true },
      devolve: avisoAdminDto,
      invalida: [provedoresAdminKeys.detail(42)],
    },
  ),
]

const CRIAR: CasoDeEscrita[] = [
  caso('useCriarErro', useCriarErro, [], erroForm, {
    verbo: 'POST',
    rota: '/erros',
    corpo: erroForm,
    devolve: erroAdminDetalheDto,
    invalida: [errosAdminKeys.lists()],
  }),
  caso(
    'useCriarProvedor',
    useCriarProvedor,
    [],
    {
      nome: 'Prefeitura de Exemplo',
      identificadorInvoicy: 'PREF-EXEMPLO',
      categoria: 'Nacional',
      aliases: ['Exemplo'],
    },
    {
      verbo: 'POST',
      rota: '/provedores',
      corpo: {
        nome: 'Prefeitura de Exemplo',
        identificadorInvoicy: 'PREF-EXEMPLO',
        categoria: 'Nacional',
        aliases: ['Exemplo'],
      },
      devolve: provedorAdminDetalheDto,
      invalida: [provedoresAdminKeys.lists()],
    },
  ),
  caso(
    'useCriarVersaoProvedor',
    useCriarVersaoProvedor,
    [42],
    { versaoLayoutId: 2, rotulo: 'ABRASF 2.04' },
    {
      verbo: 'POST',
      rota: '/provedores/42/versoes',
      corpo: { versaoLayoutId: 2, rotulo: 'ABRASF 2.04' },
      devolve: versaoAdminDetalheDto,
      invalida: [versoesAdminKeys.porProvedor(42)],
    },
  ),
  caso('useCriarCampoVersao', useCriarCampoVersao, [5], campoVersaoForm, {
    verbo: 'POST',
    rota: '/versoes/5/campos',
    corpo: campoVersaoForm,
    devolve: campoVersaoAdminDto,
    invalida: [camposVersaoKeys.all],
  }),
  caso('useCriarAvisoProvedor', useCriarAvisoProvedor, [42], avisoForm, {
    verbo: 'POST',
    rota: '/provedores/42/avisos',
    corpo: avisoForm,
    devolve: avisoAdminDto,
    invalida: [provedoresAdminKeys.detail(42)],
  }),
  caso(
    'useCriarAvisoVersao',
    useCriarAvisoVersao,
    [5],
    { ...avisoForm, campoVersaoIds: [81] },
    {
      verbo: 'POST',
      rota: '/versoes/5/avisos',
      corpo: { ...avisoForm, campoVersaoIds: [81] },
      devolve: { ...avisoAdminDto, escopo: 'Versao', provedorId: null, versaoProvedorId: 5 },
      invalida: [versoesAdminKeys.detail(5)],
    },
  ),
  caso(
    'useCriarVersaoLayout',
    useCriarVersaoLayout,
    [],
    { rotulo: '8', descricao: 'Layout 8' },
    {
      verbo: 'POST',
      rota: '/layout/versoes',
      corpo: { rotulo: '8', descricao: 'Layout 8' },
      devolve: versaoLayoutAdminDto,
      invalida: [versoesLayoutKeys.lists()],
    },
  ),
  caso(
    'useCriarCampoLayout',
    useCriarCampoLayout,
    [2],
    {
      nome: 'Discriminacao',
      caminhoXml: 'Rps/Discriminacao',
      significado: 'Texto livre que descreve o servico prestado.',
      ordem: 1,
      reformaTributaria: true,
    },
    {
      verbo: 'POST',
      rota: '/layout/versoes/2/campos',
      corpo: {
        nome: 'Discriminacao',
        caminhoXml: 'Rps/Discriminacao',
        significado: 'Texto livre que descreve o servico prestado.',
        ordem: 1,
        reformaTributaria: true,
      },
      devolve: campoLayoutResponseDto,
      invalida: [camposLayoutKeys.porVersaoLayout(2)],
    },
  ),
  caso('useCriarArtigo', useCriarArtigo, [], artigoForm, {
    verbo: 'POST',
    rota: '/artigos',
    corpo: artigoForm,
    devolve: artigoAdminDto,
    invalida: [artigosAdminKeys.all],
  }),
  // Único hook de escrita que devolve a mensagem do envelope, porque ela diz se nasceu publicado.
  caso('useCriarComunicado', useCriarComunicado, [], comunicadoForm, {
    verbo: 'POST',
    rota: '/comunicados',
    corpo: comunicadoForm,
    devolve: comunicadoAdminDto,
    mensagem: 'Comunicado criado como rascunho.',
    retorno: { comunicado: comunicadoAdminDto, mensagem: 'Comunicado criado como rascunho.' },
    invalida: [comunicadosAdminKeys.lists()],
  }),
  caso('useCriarExemplo', useCriarExemplo, [5], exemploForm, {
    verbo: 'POST',
    rota: '/versoes/5/exemplos',
    corpo: exemploForm,
    devolve: exemploAdminDto,
    invalida: [exemplosAdminKeys.porVersao(5), versoesAdminKeys.detail(5)],
  }),
]

const ATUALIZAR: CasoDeEscrita[] = [
  caso(
    'useAtualizarErro',
    useAtualizarErro,
    [],
    { id: 17, dto: erroAtualizacao, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/erros/17',
      corpo: erroAtualizacao,
      devolve: erroAdminDetalheDto,
      invalida: [errosAdminKeys.lists()],
      invalidaNoConflito: [errosAdminKeys.lists(), errosAdminKeys.detail(17)],
    },
  ),
  caso(
    'useAtualizarProvedor',
    useAtualizarProvedor,
    [],
    {
      id: 42,
      dto: { nome: 'Prefeitura de Exemplo', categoria: 'Proprio', aliases: [] },
      etag: ETAG,
    },
    {
      verbo: 'PUT',
      rota: '/provedores/42',
      corpo: { nome: 'Prefeitura de Exemplo', categoria: 'Proprio', aliases: [] },
      devolve: provedorAdminDetalheDto,
      invalida: [provedoresAdminKeys.detail(42), provedoresAdminKeys.lists()],
    },
  ),
  caso(
    'useAtualizarVersaoProvedor',
    useAtualizarVersaoProvedor,
    [],
    {
      id: 5,
      provedorId: 42,
      dto: { rotulo: 'ABRASF 2.04', introducao: 'Versao corrente.' },
      etag: ETAG,
    },
    {
      verbo: 'PUT',
      rota: '/versoes/5',
      corpo: { rotulo: 'ABRASF 2.04', introducao: 'Versao corrente.' },
      devolve: versaoAdminDetalheDto,
      invalida: [versoesAdminKeys.detail(5), versoesAdminKeys.porProvedor(42)],
    },
  ),
  caso(
    'useAtualizarCampoVersao',
    useAtualizarCampoVersao,
    [],
    { id: 81, dto: campoVersaoAtualizacao, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/campos-versao/81',
      corpo: campoVersaoAtualizacao,
      devolve: campoVersaoAdminDto,
      invalida: [camposVersaoKeys.all],
    },
  ),
  caso(
    'useAtualizarAviso',
    useAtualizarAviso,
    [provedoresAdminKeys.detail(42)],
    { id: 9, dto: avisoForm, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/avisos/9',
      corpo: avisoForm,
      devolve: avisoAdminDto,
      invalida: [provedoresAdminKeys.detail(42)],
    },
  ),
  caso(
    'useAtualizarVersaoLayout',
    useAtualizarVersaoLayout,
    [],
    { id: 2, dto: { rotulo: '8', estado: 'Vigente', ordem: 8 }, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/layout/versoes/2',
      corpo: { rotulo: '8', estado: 'Vigente', ordem: 8 },
      devolve: versaoLayoutAdminDto,
      invalida: [versoesLayoutKeys.lists()],
    },
  ),
  caso(
    'useAtualizarCampoLayout',
    useAtualizarCampoLayout,
    [],
    {
      id: 3,
      versaoLayoutId: 2,
      dto: {
        nome: 'Discriminacao',
        significado: 'Texto livre que descreve o servico prestado.',
        ordem: 1,
        reformaTributaria: true,
        estado: 'Ativo',
      },
      etag: ETAG,
    },
    {
      verbo: 'PUT',
      rota: '/campos-layout/3',
      corpo: {
        nome: 'Discriminacao',
        significado: 'Texto livre que descreve o servico prestado.',
        ordem: 1,
        reformaTributaria: true,
        estado: 'Ativo',
      },
      devolve: campoLayoutResponseDto,
      invalida: [camposLayoutKeys.porVersaoLayout(2)],
    },
  ),
  caso(
    'useAtualizarArtigo',
    useAtualizarArtigo,
    [],
    { id: 23, dto: artigoForm, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/artigos/23',
      corpo: artigoForm,
      devolve: artigoAdminDto,
      invalida: [artigosAdminKeys.all],
    },
  ),
  caso(
    'useAtualizarComunicado',
    useAtualizarComunicado,
    [],
    { id: 61, dto: comunicadoForm, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/comunicados/61',
      corpo: comunicadoForm,
      devolve: comunicadoAdminDto,
      invalida: [comunicadosAdminKeys.all],
    },
  ),
  caso(
    'useAtualizarExemplo',
    useAtualizarExemplo,
    [],
    { id: 71, versaoId: 5, dto: exemploForm, etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/exemplos/71',
      corpo: exemploForm,
      devolve: exemploAdminDto,
      invalida: [exemplosAdminKeys.porVersao(5), versoesAdminKeys.detail(5)],
    },
  ),
  caso(
    'useTrocarSlugProvedor',
    useTrocarSlugProvedor,
    [],
    { id: 42, slug: 'prefeitura-de-exemplo', etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/provedores/42/slug',
      corpo: { slug: 'prefeitura-de-exemplo' },
      devolve: provedorAdminDetalheDto,
      invalida: [provedoresAdminKeys.detail(42), provedoresAdminKeys.lists()],
    },
  ),
]

const VERIFICAR: CasoDeEscrita[] = [
  caso(
    'useVerificarArtigo',
    useVerificarArtigo,
    [],
    { id: 23, verificadoEm: '2026-10-19', etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/artigos/23/verificacao',
      corpo: { verificadoEm: '2026-10-19' },
      devolve: artigoAdminDto,
      invalida: [artigosAdminKeys.all],
    },
  ),
  caso(
    'useVerificarVersao',
    useVerificarVersao,
    [],
    { id: 5, verificadoEm: '2026-10-19', etag: ETAG },
    {
      verbo: 'PUT',
      rota: '/versoes/5/verificacao',
      corpo: { verificadoEm: '2026-10-19' },
      devolve: versaoAdminDetalheDto,
      invalida: [versoesAdminKeys.detail(5), verificacoesVencidasKeys.all],
    },
  ),
]

const REMOVER: CasoDeEscrita[] = [
  caso(
    'useRemoverErro',
    useRemoverErro,
    [],
    { id: 17, etag: ETAG },
    {
      verbo: 'DELETE',
      rota: '/erros/17',
      invalida: [errosAdminKeys.lists()],
    },
  ),
  caso(
    'useRemoverCampoVersao',
    useRemoverCampoVersao,
    [],
    { id: 81, etag: ETAG },
    {
      verbo: 'DELETE',
      rota: '/campos-versao/81',
      invalida: [camposVersaoKeys.all],
    },
  ),
  caso(
    'useRemoverAviso',
    useRemoverAviso,
    [provedoresAdminKeys.detail(42)],
    { id: 9, etag: ETAG },
    {
      verbo: 'DELETE',
      rota: '/avisos/9',
      invalida: [provedoresAdminKeys.detail(42)],
    },
  ),
  caso(
    'useRemoverCampoLayout',
    useRemoverCampoLayout,
    [],
    { id: 3, versaoLayoutId: 2, etag: ETAG },
    {
      verbo: 'DELETE',
      rota: '/campos-layout/3',
      invalida: [camposLayoutKeys.porVersaoLayout(2)],
    },
  ),
  caso(
    'useRemoverArtigo',
    useRemoverArtigo,
    [],
    { id: 23, etag: ETAG },
    {
      verbo: 'DELETE',
      rota: '/artigos/23',
      invalida: [artigosAdminKeys.all],
    },
  ),
  caso(
    'useRemoverComunicado',
    useRemoverComunicado,
    [],
    { id: 61, etag: ETAG },
    {
      verbo: 'DELETE',
      rota: '/comunicados/61',
      invalida: [comunicadosAdminKeys.all],
    },
  ),
  caso(
    'useRemoverExemplo',
    useRemoverExemplo,
    [],
    { id: 71, versaoId: 5, etag: ETAG },
    {
      verbo: 'DELETE',
      rota: '/exemplos/71',
      invalida: [exemplosAdminKeys.porVersao(5), versoesAdminKeys.detail(5)],
    },
  ),
]

describe('usePublicar*: PUT .../publicacao com { publicado } e If-Match', () => {
  it.each(PUBLICAR)('$nome', verificarContrato)
})

describe('useCriar*: POST sem If-Match', () => {
  it.each(CRIAR)('$nome', verificarContrato)
})

describe('useAtualizar*: PUT com If-Match', () => {
  it.each(ATUALIZAR)('$nome', verificarContrato)
})

describe('useVerificar*: PUT .../verificacao com { verificadoEm } e If-Match', () => {
  it.each(VERIFICAR)('$nome', verificarContrato)
})

describe('useRemover*: DELETE sem corpo e com If-Match', () => {
  it.each(REMOVER)('$nome', verificarContrato)
})

// Toda escrita com If-Match: publicar, atualizar, verificar e remover. Só a criação (POST) fica fora.
const COM_IF_MATCH = [...PUBLICAR, ...ATUALIZAR, ...VERIFICAR, ...REMOVER]

describe('escrita com If-Match: 409 de concorrência relê o registro', () => {
  it.each(COM_IF_MATCH)('$nome', verificarReleituraNoConflito)
})

// O caminho é conferido: ponteiro para um teste que não importa o hook não vale como cobertura.
const ACOES_COM_TESTE_PROPRIO: Record<string, string> = {
  useAlterarEstadoLacunaBusca: './lacunasBusca/hooks/useAlterarEstadoLacunaBusca.test.ts',
  useRegistrarLacunaBusca: './lacunasBusca/hooks/useRegistrarLacunaBusca.test.ts',
}

const CASOS = [...PUBLICAR, ...CRIAR, ...ATUALIZAR, ...VERIFICAR, ...REMOVER]

const FONTES = import.meta.glob(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const MODULOS = import.meta.glob<Record<string, unknown>>(['./**/*.ts', '!./**/*.test.ts'])

const TESTES = import.meta.glob<string>('./**/*.test.{ts,tsx}', {
  query: '?raw',
  import: 'default',
})

const ESCRITA = /\buseMutation\s*[(<]|\bcriarUsePublicar\s*[(<]/

// A fábrica não é hook: cada usePublicar* gerado por ela tem a sua linha.
const FABRICA_DE_HOOKS = './hooks/criarUsePublicar.ts'

function arquivosDeEscrita(): string[] {
  return Object.entries(FONTES)
    .filter(([caminho]) => caminho !== FABRICA_DE_HOOKS)
    .filter(([, conteudo]) => ESCRITA.test(conteudo))
    .map(([caminho]) => caminho)
    .sort()
}

describe('universo dos hooks de escrita da área interna', () => {
  it('a varredura enxerga os hooks de escrita', () => {
    expect(arquivosDeEscrita().length).toBeGreaterThanOrEqual(41)
  })

  it('todo hook de escrita tem linha nas tabelas ou teste próprio, e toda linha tem hook', async () => {
    const semLinha: string[] = []
    const exportados = new Set<string>()

    for (const caminho of arquivosDeEscrita()) {
      const carregar = MODULOS[caminho]
      if (!carregar) {
        semLinha.push(`${caminho}: escrita fora de um módulo de hook`)
        continue
      }

      const hooks = Object.entries(await carregar()).filter(
        ([nome, valor]) => typeof valor === 'function' && /^use[A-Z]/.test(nome),
      )
      if (hooks.length === 0) semLinha.push(`${caminho}: nenhum hook exportado`)

      for (const [nome, hook] of hooks) {
        exportados.add(nome)
        const linha = CASOS.find((casoDaTabela) => casoDaTabela.hook === hook)
        if (linha?.nome === nome || nome in ACOES_COM_TESTE_PROPRIO) continue
        semLinha.push(`${caminho}: ${nome}`)
      }
    }

    const linhasSemHook = [
      ...CASOS.map(({ nome }) => nome),
      ...Object.keys(ACOES_COM_TESTE_PROPRIO),
    ].filter((nome) => !exportados.has(nome))

    expect(semLinha).toEqual([])
    expect(linhasSemHook).toEqual([])
  })

  it('todo hook com If-Match está numa tabela que exige a releitura no 409', async () => {
    const foraDaTabela: string[] = []

    for (const caminho of arquivosDeEscrita()) {
      const carregar = MODULOS[caminho]
      if (!carregar) continue

      for (const [nome, hook] of Object.entries(await carregar())) {
        if (!/^use(Atualizar|Trocar|Publicar|Verificar|Remover)[A-Z]/.test(nome)) continue
        const naTabela = COM_IF_MATCH.some((linha) => linha.hook === hook && linha.nome === nome)
        if (!naTabela) foraDaTabela.push(`${caminho}: ${nome}`)
      }
    }

    expect(foraDaTabela).toEqual([])
  })

  it.each(Object.entries(ACOES_COM_TESTE_PROPRIO))(
    '%s é importado pelo teste citado',
    async (nome, caminhoDoTeste) => {
      const carregar = TESTES[caminhoDoTeste]
      expect(carregar, caminhoDoTeste).toBeDefined()
      expect(await carregar()).toMatch(new RegExp(`from '[^']*/${nome}'`))
    },
  )
})
