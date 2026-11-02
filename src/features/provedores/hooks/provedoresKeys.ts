import { criarFabricaDeChaves } from '../../../utils/queryKeyFactory'
import type { AlcanceDoEnvioModelo } from '../types/envioModelo'

export interface ListarProvedoresParams {
  q?: string
  categoria?: 'Nacional' | 'Proprio'
  ordenarPor?: 'nome' | 'verificadoEm'
  direcao?: 'asc' | 'desc'
  pagina?: number
  tamanhoPagina?: number
}

const base = criarFabricaDeChaves<ListarProvedoresParams>('provedores')

export const provedoresKeys = {
  ...base,
  // P3 — identidade + avisos de provedor + lista de versões (route.tsx e as duas sub-rotas
  // reaproveitam a mesma chave, nunca refazem o fetch por conta própria).
  detail: (slug: string) => [...base.all, 'detail', slug] as const,
  // P4 — conteúdo da aba. Inclui os dois slugs: trocar de aba é navegação de rota, e cada
  // combinação provedor+versão é uma entrada de cache própria.
  versao: (provedorSlug: string, versaoSlug: string) =>
    [...base.all, 'versao', provedorSlug, versaoSlug] as const,
  // Envio modelo da versão: cada alcance é uma entrada própria, para a troca não buscar de novo.
  envioModelo: (provedorSlug: string, versaoSlug: string, alcance: AlcanceDoEnvioModelo) =>
    [...base.all, 'envio-modelo', provedorSlug, versaoSlug, alcance] as const,
}
