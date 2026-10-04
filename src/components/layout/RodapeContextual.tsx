import { Link, type LinkProps } from '@tanstack/react-router'
import { CONTEUDO_RODAPE_CONSTANTE } from '../../utils/rodapeConteudoConstante'

/**
 * Todo contexto público que precisa de um "próximo passo" no rodapé (§8).
 * FRONT-2b/2c passam os parâmetros de rota que já têm em mãos (slug de
 * provedor/versão) — quem calcula a mensagem e o link é este componente.
 */
export type ContextoRodape =
  | { tipo: 'home' }
  | { tipo: 'busca-com-resultado' }
  | { tipo: 'busca-sem-resultado' }
  | { tipo: 'provedores' }
  /** Índice de artigos (tela 7) e página do artigo (telas 8/9) — §2.2/§3.5. */
  | { tipo: 'artigos' }
  | { tipo: 'provedor-sem-versao' }
  | { tipo: 'provedor-versao'; provedorSlug: string }
  | { tipo: 'erro-com-contexto'; provedorSlug: string; versaoSlug: string }
  /** Erro geral (U9) — próximo passo omitido, não faz sentido apontar para uma versão que não existe. */
  | { tipo: 'erro-sem-contexto' }
  /** Índice de versões do Layout InvoiCy (tela 6, `/layout`) — FRONT-C. */
  | { tipo: 'layout' }
  /**
   * `/layout/campos/{campoSlug}` enquanto o skeleton de resolução está
   * visível (A3) — na prática quase nunca aparece de fato, porque a rota
   * redireciona antes de montar o rodapé; existe para o caso de erro
   * `404`/`410` nessa rota (FRONT-C).
   */
  | { tipo: 'layout-campo' }

export interface RodapeContextualProps {
  contexto: ContextoRodape
}

interface ProximoPasso {
  mensagem: string
  acao?: { rotulo: string; href: string }
}

function obterProximoPasso(contexto: ContextoRodape): ProximoPasso | null {
  switch (contexto.tipo) {
    case 'home':
      return {
        mensagem: 'Tem um chamado com código de erro ou mensagem da prefeitura? Comece pela busca.',
      }
    case 'busca-com-resultado':
      return {
        mensagem: 'Não achou exatamente o que precisava? Refine a busca ou filtre por provedor.',
      }
    case 'busca-sem-resultado':
      return {
        mensagem: 'Buscou e não achou? Fale com o suporte levando o termo.',
        acao: {
          rotulo: 'Falar com o suporte',
          href: `mailto:${CONTEUDO_RODAPE_CONSTANTE.atendimento.emailSuporte}?subject=${encodeURIComponent(
            'Codex · busca sem resultado',
          )}`,
        },
      }
    case 'provedores':
      return { mensagem: 'Já sabe o nome e a versão? Abra direto o provedor.' }
    case 'artigos':
      return {
        mensagem: 'Está com um chamado aberto? Busque pelo código do erro ou pela mensagem.',
        acao: { rotulo: 'Buscar', href: '/busca' },
      }
    case 'provedor-sem-versao':
      return {
        mensagem:
          'Não sabe qual versão é a sua? Confira a data de verificação de cada uma antes de escolher.',
      }
    case 'provedor-versao':
      return {
        mensagem: 'Encontrou uma rejeição usando esta versão? Busque pelo código ou pela mensagem.',
        acao: { rotulo: 'Buscar', href: `/busca?provedor=${contexto.provedorSlug}` },
      }
    case 'erro-com-contexto':
      return {
        mensagem: 'Corrigiu este campo? Confira o resto da versão.',
        acao: {
          rotulo: 'Ver versão completa',
          href: `/provedores/${contexto.provedorSlug}/${contexto.versaoSlug}`,
        },
      }
    case 'erro-sem-contexto':
      return null
    case 'layout':
      return {
        mensagem: 'Sabe o campo — falta saber como o seu provedor trata ele.',
        acao: { rotulo: 'Ver os provedores', href: '/provedores' },
      }
    case 'layout-campo':
      return {
        mensagem:
          'Um campo do layout está descrito de forma ambígua? Fale com o suporte com o nome do campo.',
        acao: {
          rotulo: 'Falar com o suporte',
          href: `mailto:${CONTEUDO_RODAPE_CONSTANTE.atendimento.emailSuporte}?subject=${encodeURIComponent(
            'Codex · Layout InvoiCy',
          )}`,
        },
      }
  }
}

/**
 * Rodapé de toda página pública (M31 — dono: FRONT-2a; nunca usado na área
 * interna). Estrutura fixa (§8): próximo passo específico do contexto no
 * topo; bloco de atendimento e coluna de links da Migrate **constantes**
 * embaixo, iguais em qualquer página.
 */
export function RodapeContextual({ contexto }: RodapeContextualProps) {
  const proximoPasso = obterProximoPasso(contexto)
  const { atendimento, linksMigrate } = CONTEUDO_RODAPE_CONSTANTE

  return (
    <footer className="border-t border-line bg-surface-hover">
      {proximoPasso && (
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-b border-line px-4 py-4 text-center sm:flex-row sm:text-left lg:px-8">
          <p className="text-sm text-ink">{proximoPasso.mensagem}</p>
          {proximoPasso.acao &&
            (proximoPasso.acao.href.startsWith('mailto:') ? (
              <a
                href={proximoPasso.acao.href}
                className="text-sm font-semibold text-primary-medium hover:underline"
              >
                {proximoPasso.acao.rotulo}
              </a>
            ) : (
              <Link
                to={proximoPasso.acao.href as unknown as LinkProps['to']}
                className="text-sm font-semibold text-primary-medium hover:underline"
              >
                {proximoPasso.acao.rotulo}
              </Link>
            ))}
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 lg:px-8">
        <div>
          <h2 className="text-xs font-semibold uppercase text-muted">Atendimento</h2>
          <a
            href={atendimento.telefoneHref}
            className="mt-2 block text-card-titulo font-bold text-ink"
          >
            {atendimento.telefone}
          </a>
          <p className="text-xs text-muted">{atendimento.horario}</p>
        </div>

        <nav aria-label="Links da Migrate">
          <h2 className="text-xs font-semibold uppercase text-muted">Migrate</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {linksMigrate.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink/70 hover:text-primary-medium hover:underline"
                >
                  {link.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
