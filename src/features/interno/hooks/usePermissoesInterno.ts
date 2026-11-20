import { keycloak } from '../../../auth/keycloak'

export interface PermissoesEntidade {
  buscar: boolean
  adicionar: boolean
  atualizar: boolean
  remover: boolean
  /** Role `<entidade>-publicar` (M19) - inexistente para `camposVersao`, sempre `false` ali. */
  publicar: boolean
}

export interface PermissoesInterno {
  provedores: PermissoesEntidade
  versoesProvedor: PermissoesEntidade
  camposVersao: PermissoesEntidade
  /** `exemplos-*` - sem `publicar` (C1): exemplo herda a visibilidade da versão. */
  exemplos: PermissoesEntidade
  avisos: PermissoesEntidade
  versoesLayout: PermissoesEntidade
  campoLayout: PermissoesEntidade
  erros: PermissoesEntidade
  artigos: PermissoesEntidade
  comunicados: PermissoesEntidade
  /** `lacunasbusca-*` - fila editorial (buscas internas sem resultado); sem `publicar`. */
  lacunasBusca: PermissoesEntidade
  buscaInterna: { buscar: boolean }
}

const CLIENT_ID_BACKEND = 'codex-backend'
const ROLE_BUSCA_INTERNA = 'indicebusca-buscar'

function agrupar(roles: string[], entidade: string): PermissoesEntidade {
  return {
    buscar: roles.includes(`${entidade}-buscar`),
    adicionar: roles.includes(`${entidade}-adicionar`),
    atualizar: roles.includes(`${entidade}-atualizar`),
    remover: roles.includes(`${entidade}-remover`),
    publicar: roles.includes(`${entidade}-publicar`),
  }
}

/**
 * Agrupa as roles do token Keycloak por entidade (`analise-frontend.md` §6.5,
 * M21). **Só UX** - esconde/desabilita botão. O backend é a fonte de verdade
 * (`rules/keycloak.md`); nenhuma regra de negócio depende deste hook.
 *
 * Extrair no topo da página e propagar por prop - nunca espalhar a chamada
 * deste hook por componente (`rules/integracao-frontend-bms.md` § Permissões,
 * princípio geral reaproveitado aqui mesmo fora do BMS).
 */
export function usePermissoesInterno(): PermissoesInterno {
  const roles = keycloak.tokenParsed?.resource_access?.[CLIENT_ID_BACKEND]?.roles ?? []

  return {
    provedores: agrupar(roles, 'provedores'),
    versoesProvedor: agrupar(roles, 'versoesprovedor'),
    camposVersao: agrupar(roles, 'camposversao'),
    exemplos: agrupar(roles, 'exemplos'),
    avisos: agrupar(roles, 'avisos'),
    versoesLayout: agrupar(roles, 'versoeslayout'),
    campoLayout: agrupar(roles, 'campolayout'),
    erros: agrupar(roles, 'erros'),
    artigos: agrupar(roles, 'artigos'),
    comunicados: agrupar(roles, 'comunicados'),
    lacunasBusca: agrupar(roles, 'lacunasbusca'),
    buscaInterna: { buscar: roles.includes(ROLE_BUSCA_INTERNA) },
  }
}
