/**
 * Conteúdo fixo do rodapé público (§8) — bloco de atendimento e coluna de
 * links da Migrate, iguais em toda página pública. Vive centralizado aqui
 * (não hardcoded em `RodapeContextual`) para não divergir entre páginas.
 *
 * Telefone/horário/e-mail de suporte replicam o conteúdo real já usado nos
 * artboards do MVP (`Codex Busca.dc.html` e demais telas, coluna
 * "Atendimento"). URLs da coluna "Migrate" são placeholders — a demanda não
 * define os destinos reais ainda (ver handoff).
 */
export const CONTEUDO_RODAPE_CONSTANTE = {
  atendimento: {
    telefone: '+55 48 3123-4567',
    telefoneHref: 'tel:+554831234567',
    horario: 'Segunda a sexta, 08h às 18h (horário de Brasília)',
    emailSuporte: 'suporte@migrate.info',
  },
  linksMigrate: [
    { rotulo: 'InvoiCy', href: 'https://invoicy.com.br' },
    { rotulo: 'Central de ajuda', href: 'https://ajuda.migrate.info' },
    { rotulo: 'Status dos serviços', href: 'https://status.migrate.info' },
  ],
} as const
