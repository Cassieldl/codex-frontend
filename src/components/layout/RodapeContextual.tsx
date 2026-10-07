import { Link, type LinkProps } from '@tanstack/react-router'
import { montarLinkSuporte, ROTULO_FALAR_COM_SUPORTE } from '../../utils/linkSuporte'
import { CONTEUDO_RODAPE_CONSTANTE } from '../../utils/rodapeConteudoConstante'

/** Âncora da seção "Provedores e versões aplicáveis" da página do erro. */
export const ID_SECAO_VERSOES_APLICAVEIS = 'provedores-versoes-titulo'

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
  | { tipo: 'erro-com-contexto'; provedorSlug: string; versaoSlug: string; codigoErro?: string }
  /** Erro geral (U9): vale para qualquer integração, não há versão para apontar. */
  | { tipo: 'erro-geral'; codigoErro?: string }
  /** Erro que se aplica a mais de uma versão — o caso mais consultado (§7.1). */
  | { tipo: 'erro-varias-versoes'; codigoErro?: string }
  /** Páginas de erro sem erro carregado (carregando, falha, índice, 404): sem próximo passo. */
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

interface AcaoRodape {
  rotulo: string
  href: string
}

interface ProximoPasso {
  mensagem: string
  acao?: AcaoRodape
  /** Caminho ao suporte que acompanha o próximo passo (§7.2). */
  acaoSecundaria?: AcaoRodape
}

function montarAcaoSuporte(assunto: string, corpo?: string): AcaoRodape {
  return { rotulo: ROTULO_FALAR_COM_SUPORTE, href: montarLinkSuporte(assunto, corpo) }
}

function montarAcaoSuporteDeErro(codigoErro?: string): AcaoRodape {
  return montarAcaoSuporte(
    codigoErro ? `Codex · erro ${codigoErro}` : 'Codex · erro',
    codigoErro ? `Código do erro: ${codigoErro}` : undefined,
  )
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
        acao: montarAcaoSuporte('Codex · busca sem resultado'),
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
        acaoSecundaria: montarAcaoSuporteDeErro(contexto.codigoErro),
      }
    case 'erro-geral':
      return {
        mensagem: 'Não é esse o erro que você recebeu? Busque pelo código ou pela mensagem.',
        acao: { rotulo: 'Buscar', href: '/busca' },
        acaoSecundaria: montarAcaoSuporteDeErro(contexto.codigoErro),
      }
    case 'erro-varias-versoes':
      return {
        mensagem: 'Este erro aparece em mais de uma versão. Abra a sua para ver o campo exato.',
        acao: { rotulo: 'Ver as versões aplicáveis', href: `#${ID_SECAO_VERSOES_APLICAVEIS}` },
        acaoSecundaria: montarAcaoSuporteDeErro(contexto.codigoErro),
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
        acao: montarAcaoSuporte('Codex · Layout InvoiCy'),
      }
  }
}

const CLASSE_ACAO = 'text-sm font-semibold text-primary-medium hover:underline'

/** `mailto:` e âncora da própria página são `<a>`; o resto navega pelo roteador. */
function AcaoDoRodape({ acao }: { acao: AcaoRodape }) {
  if (acao.href.startsWith('mailto:') || acao.href.startsWith('#')) {
    return (
      <a href={acao.href} className={CLASSE_ACAO}>
        {acao.rotulo}
      </a>
    )
  }

  return (
    <Link to={acao.href as unknown as LinkProps['to']} className={CLASSE_ACAO}>
      {acao.rotulo}
    </Link>
  )
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
          {(proximoPasso.acao || proximoPasso.acaoSecundaria) && (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {proximoPasso.acao && <AcaoDoRodape acao={proximoPasso.acao} />}
              {proximoPasso.acaoSecundaria && <AcaoDoRodape acao={proximoPasso.acaoSecundaria} />}
            </div>
          )}
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
