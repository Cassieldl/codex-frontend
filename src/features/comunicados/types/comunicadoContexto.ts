import type { AbrangenciaComunicado, SeveridadeComunicado } from '../../home/types/home'

/**
 * Comunicado no ar para a página aberta (`GET /comunicados`, `ComunicadoPublicoDto`). Diferente do
 * item da Home, traz `id` e os rótulos de provedor e de versão, porque aqui a leitura é por
 * contexto: o mesmo bloco mostra o comunicado do provedor e o de uma das versões dele.
 */
export interface ComunicadoContexto {
  id: number
  titulo: string
  corpo: string
  severidade: SeveridadeComunicado
  abrangencia: AbrangenciaComunicado
  expiraEm: string
  /** `null` só em `Global`. */
  provedor: { nome: string; slug: string } | null
  /** Preenchido só em `ProvedorVersao`. */
  versao: { rotulo: string; slug: string } | null
  /** `/provedores/{slug}[/{versao}]`; `null` em `Global`. */
  url: string | null
}

/** Página que pede os comunicados: os provedores dela e, quando há, a versão aberta. */
export interface ContextoDeComunicados {
  provedorSlugs: string[]
  versaoSlug?: string
}
