import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowRight, Clock, ExternalLink, LifeBuoy, Mail, Phone } from 'lucide-react'
import { montarLinkSuporte, ROTULO_FALAR_COM_SUPORTE } from '../../utils/linkSuporte'
import { CONTEUDO_RODAPE_CONSTANTE } from '../../utils/rodapeConteudoConstante'
import { PontoDeMarca } from '../ui/PontoDeMarca'
import { Sobrelinha } from '../ui/Sobrelinha'
import { PontosDeLuz } from './PontosDeLuz'

/** Âncora da seção "Provedores aplicáveis" da página do erro. */
export const ID_SECAO_PROVEDORES_APLICAVEIS = 'provedores-aplicaveis-titulo'

/**
 * Todo contexto público que precisa de um "próximo passo" no rodapé (§8).
 * FRONT-2b/2c passam os parâmetros de rota que já têm em mãos (slug do
 * provedor): quem calcula a mensagem e o link é este componente.
 */
export type ContextoRodape =
  | { tipo: 'home' }
  | { tipo: 'busca-com-resultado' }
  | { tipo: 'busca-sem-resultado' }
  | { tipo: 'provedores' }
  /** Índice de artigos (tela 7) e página do artigo (telas 8/9) — §2.2/§3.5. */
  | { tipo: 'artigos' }
  | { tipo: 'provedor'; provedorSlug: string }
  | {
      tipo: 'erro-com-contexto'
      provedorSlug: string
      codigoErro?: string
      /** O erro aponta campo do layout: só então o texto fala em "corrigir o campo". */
      temCampoRelacionado?: boolean
    }
  /** Erro geral (U9): vale para qualquer integração, não há provedor para apontar. */
  | { tipo: 'erro-geral'; codigoErro?: string }
  /** Erro que se aplica a mais de um provedor, o caso mais consultado (§7.1). */
  | { tipo: 'erro-varios-provedores'; codigoErro?: string }
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

/**
 * A faixa só aparece onde há um passo diferente do que a tela já oferece. Buscar não conta: o
 * campo está no cabeçalho de toda página pública.
 */
function obterProximoPasso(contexto: ContextoRodape): ProximoPasso | null {
  switch (contexto.tipo) {
    case 'home':
    case 'busca-com-resultado':
    case 'provedores':
    case 'artigos':
    case 'provedor':
    case 'erro-sem-contexto':
      return null
    case 'busca-sem-resultado':
      return {
        mensagem: 'Buscou e não achou? Fale com o suporte levando o termo.',
        acao: montarAcaoSuporte('Codex · busca sem resultado'),
      }
    case 'erro-com-contexto':
      return {
        mensagem: contexto.temCampoRelacionado
          ? 'Corrigiu este campo? Confira o resto do provedor.'
          : 'Resolveu este erro? Confira o resto do provedor.',
        acao: { rotulo: 'Ver o provedor completo', href: `/provedores/${contexto.provedorSlug}` },
        acaoSecundaria: montarAcaoSuporteDeErro(contexto.codigoErro),
      }
    case 'erro-geral':
      return {
        mensagem: 'Seguiu a orientação e o erro continua? Fale com o suporte levando o código.',
        acao: montarAcaoSuporteDeErro(contexto.codigoErro),
      }
    case 'erro-varios-provedores':
      return {
        mensagem: 'Este erro aparece em mais de um provedor. Abra o seu para ver o campo exato.',
        acao: {
          rotulo: 'Ver os provedores aplicáveis',
          href: `#${ID_SECAO_PROVEDORES_APLICAVEIS}`,
        },
        acaoSecundaria: montarAcaoSuporteDeErro(contexto.codigoErro),
      }
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

/**
 * Botões sobre o fundo escuro: a ação principal é laranja com texto azul-profundo (5,66:1) e a
 * de suporte é contornada. Laranja como fundo de botão só existe sobre superfície escura. Hover por sombra, como no resto do produto.
 */
const CLASSE_ACAO_BASE =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-sm font-semibold transition-shadow duration-150 hover:shadow-panel'

const CLASSE_ACAO_PRINCIPAL = `${CLASSE_ACAO_BASE} bg-accent text-primary`

const CLASSE_ACAO_SECUNDARIA = `${CLASSE_ACAO_BASE} border border-white text-white`

const CLASSE_LINK_RODAPE =
  'inline-flex items-center gap-2 text-sm text-white underline-offset-4 hover:underline'

/** `mailto:` e âncora da própria página são `<a>`; o resto navega pelo roteador. */
function AcaoDoRodape({ acao, classe }: { acao: AcaoRodape; classe: string }) {
  if (acao.href.startsWith('mailto:') || acao.href.startsWith('#')) {
    return (
      <a href={acao.href} className={classe}>
        {acao.rotulo}
      </a>
    )
  }

  return (
    <Link to={acao.href as unknown as LinkProps['to']} className={classe}>
      {acao.rotulo}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  )
}

/**
 * Rodapé de toda página pública (nunca usado na área interna). Estrutura fixa: próximo passo
 * específico do contexto no topo; marca, atendimento e links da Migrate constantes embaixo.
 */
export function RodapeContextual({ contexto }: RodapeContextualProps) {
  const proximoPasso = obterProximoPasso(contexto)
  const { atendimento, linksMigrate } = CONTEUDO_RODAPE_CONSTANTE

  return (
    <footer className="relative isolate bg-primary text-white">
      <PontosDeLuz />

      {proximoPasso && (
        <div className="border-b border-white/15">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:text-left lg:px-8">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <Sobrelinha>Próximo passo</Sobrelinha>
              <p className="text-card-titulo font-semibold">{proximoPasso.mensagem}</p>
            </div>
            {(proximoPasso.acao || proximoPasso.acaoSecundaria) && (
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-3">
                {proximoPasso.acao && (
                  <AcaoDoRodape acao={proximoPasso.acao} classe={CLASSE_ACAO_PRINCIPAL} />
                )}
                {proximoPasso.acaoSecundaria && (
                  <AcaoDoRodape
                    acao={proximoPasso.acaoSecundaria}
                    classe={CLASSE_ACAO_SECUNDARIA}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] lg:px-8">
        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <img src="/marca/logo-migrate-branco.svg" alt="Migrate" className="h-7 w-auto" />
            <span aria-hidden="true" className="h-6 w-px bg-white/40" />
            <span className="text-lg font-extrabold">Codex</span>
          </div>
          <p className="max-w-xs text-sm text-white">
            Portal técnico de integração NFS-e: como cada provedor trata cada campo do Layout
            InvoiCy.
          </p>
          <p className="text-sm font-semibold italic">
            Evolua
            <PontoDeMarca /> Transforme
            <PontoDeMarca /> Movimente
            <PontoDeMarca />
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold tracking-wider text-white uppercase">Atendimento</h2>
          <ul className="mt-4 flex flex-col gap-3">
            <li>
              <a
                href={atendimento.telefoneHref}
                className="inline-flex items-center gap-2 text-card-titulo font-bold text-white underline-offset-4 hover:underline"
              >
                <Phone className="size-4 text-accent" aria-hidden="true" />
                {atendimento.telefone}
              </a>
            </li>
            <li>
              <a href={`mailto:${atendimento.emailSuporte}`} className={CLASSE_LINK_RODAPE}>
                <Mail className="size-4 text-accent" aria-hidden="true" />
                {atendimento.emailSuporte}
              </a>
            </li>
            <li>
              <a
                href={atendimento.chamado.href}
                target="_blank"
                rel="noopener noreferrer"
                className={CLASSE_LINK_RODAPE}
              >
                <LifeBuoy className="size-4 text-accent" aria-hidden="true" />
                {atendimento.chamado.rotulo}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </li>
            <li className="inline-flex items-center gap-2 text-xs text-white">
              <Clock className="size-4 text-accent" aria-hidden="true" />
              {atendimento.horario}
            </li>
          </ul>
        </div>

        <nav aria-label="Links da Migrate">
          <h2 className="text-xs font-bold tracking-wider text-white uppercase">Migrate</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {linksMigrate.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={CLASSE_LINK_RODAPE}
                >
                  {link.rotulo}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
