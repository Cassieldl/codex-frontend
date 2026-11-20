/**
 * Conteúdo fixo do rodapé público (§8) - bloco de atendimento e coluna de
 * links da Migrate, iguais em toda página pública. Vive centralizado aqui
 * (não hardcoded em `RodapeContextual`) para não divergir entre páginas; o
 * e-mail também alimenta todo link "Falar com o suporte" (`linkSuporte.ts`).
 *
 * A coluna "Migrate" só leva destinos conferidos: `ajuda.migrate.info` e
 * `status.migrate.info` respondiam com o mesmo site genérico que qualquer
 * subdomínio inventado - curinga do DNS, não páginas reais.
 */
export const CONTEUDO_RODAPE_CONSTANTE = {
  atendimento: {
    telefone: '+55 11 4240-6556',
    telefoneHref: 'tel:+551142406556',
    horario: 'Segunda a sexta-feira, das 08:00 às 18:00',
    emailSuporte: 'supportbr@migrate.info',
    chamado: { rotulo: 'Abrir chamado', href: 'https://support.migrate.info/tickets' },
  },
  linksMigrate: [
    { rotulo: 'InvoiCy', href: 'https://invoicy.com.br' },
    {
      rotulo: 'Base de conhecimento',
      href: 'https://desenvolvedores.migrate.info/?utm_source=site',
    },
    { rotulo: 'GitHub', href: 'https://github.com/migrate-company/integracao-InvoiCy-BR' },
  ],
} as const
