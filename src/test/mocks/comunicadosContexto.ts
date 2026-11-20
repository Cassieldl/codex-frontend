import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'

/**
 * JSON literal transcrito de `ComunicadoPublicoDto` (`codex-backend`, `ComunicadoPublicoDtos.cs`),
 * como o servidor serializa (`Severidade` e `Abrangencia` em texto, `ExpiraEm` com deslocamento).
 * Sem anotação com o tipo do cliente, de propósito: tipar o mock pela interface do front faria o
 * compilador forçar o mock a ter a forma que o cliente acredita, e o teste confirmaria o mock em
 * vez do contrato.
 */

export const COMUNICADO_GLOBAL = {
  id: 1,
  titulo: 'Manutenção programada da plataforma',
  corpo: 'A plataforma fica instável no sábado.',
  severidade: 'Informativo',
  abrangencia: 'Global',
  expiraEm: '2026-10-20T15:00:00+00:00',
  provedor: null,
  versao: null,
  url: null,
}

export const COMUNICADO_CRITICO_DO_PROVEDOR = {
  id: 2,
  titulo: 'Instabilidade na emissão',
  corpo: 'A prefeitura recusa a emissão.\n\nAguarde o restabelecimento.',
  severidade: 'Critico',
  abrangencia: 'Provedor',
  expiraEm: '2026-10-08T15:00:00+00:00',
  provedor: { nome: 'Prefeitura de Exemplo', slug: 'prefeitura-exemplo' },
  versao: null,
  url: '/provedores/prefeitura-exemplo',
}

export const COMUNICADO_DE_VERSAO = {
  id: 3,
  titulo: 'Layout 2.04 em homologação',
  corpo: 'Os campos podem mudar sem aviso.',
  severidade: 'Alerta',
  abrangencia: 'ProvedorVersao',
  expiraEm: '2026-11-01T12:00:00+00:00',
  provedor: { nome: 'Prefeitura de Exemplo', slug: 'prefeitura-exemplo' },
  versao: { rotulo: '2.04', slug: '2-04' },
  url: '/provedores/prefeitura-exemplo/2-04',
}

/**
 * Handler de `GET /comunicados` que anota a URL de cada chamada - o teste confere os parâmetros
 * que chegaram ao servidor, não os que o cliente acredita ter enviado.
 */
export function handlerComunicadosRegistrandoChamadas(comunicados: object[]): {
  handler: HttpHandler
  chamadas: URL[]
} {
  const chamadas: URL[] = []

  const handler = http.get(`${import.meta.env.VITE_API_URL}/comunicados`, ({ request }) => {
    chamadas.push(new URL(request.url))
    return HttpResponse.json({ data: comunicados })
  })

  return { handler, chamadas }
}
