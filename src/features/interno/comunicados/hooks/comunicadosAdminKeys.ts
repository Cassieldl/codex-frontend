import { criarFabricaDeChaves } from '../../../../utils/queryKeyFactory'
import type { AbrangenciaComunicado, SeveridadeComunicado } from '../types/comunicadoAdmin'

export interface ListarComunicadosAdminParams {
  severidade?: SeveridadeComunicado
  abrangencia?: AbrangenciaComunicado
  provedorId?: number
  /**
   * Default `false` no backend (I30) - esconde só o que **encerrou**
   * (`expiraEm` no passado). Rascunho vigente continua na visão padrão.
   */
  incluirEncerrados?: boolean
  pagina?: number
  tamanhoPagina?: number
}

const base = criarFabricaDeChaves<ListarComunicadosAdminParams>('comunicadosAdmin')

export const comunicadosAdminKeys = {
  ...base,
  detail: (id: number) => [...base.all, 'detail', id] as const,
}
