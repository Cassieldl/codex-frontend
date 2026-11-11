import type { TipoArtigo } from '../types/artigo'

/** Rótulo visível de cada tipo: o contrato é ASCII (`Mudanca`) e o acento entra só na exibição. */
export const ROTULO_TIPO_ARTIGO: Record<TipoArtigo, string> = {
  Conceito: 'Conceito',
  Procedimento: 'Procedimento',
  Mudanca: 'Mudança/Migração',
  Configuracao: 'Configurações do InvoiCy',
}

/** Como ler cada tipo: texto de apoio do índice, nunca substitui o rótulo. */
export const LEITURA_TIPO_ARTIGO: Record<TipoArtigo, string> = {
  Conceito: 'leitura para entender',
  Procedimento: 'leitura para executar',
  Mudanca: 'leitura para ajustar o ERP',
  Configuracao: 'leitura para configurar o InvoiCy',
}
