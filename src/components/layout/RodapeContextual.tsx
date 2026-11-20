import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowRight, ArrowUp, Clock, Mail, Phone } from 'lucide-react'
import { useLayoutIndice } from '../../features/layout/hooks/useLayoutIndice'
import { montarLinkSuporte, ROTULO_FALAR_COM_SUPORTE } from '../../utils/linkSuporte'
import { CONTEUDO_RODAPE_CONSTANTE } from '../../utils/rodapeConteudoConstante'
import { formatarVersaoLayout } from '../../utils/versaoDoLayout'
import { LinkExterno } from '../ui/LinkExterno'
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
  /**
   * Rótulo da versão vigente quando a página já o tem por outro caminho (a Home, pelo agregador).
   * O índice do layout em cache tem precedência; sem nenhum dos dois, a linha final não cita versão.
   */
  versaoVigenteDoLayout?: string | null
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
 * Passo específico só onde ele difere do que a tela já oferece; sem ele, vale a faixa de chamado.
 * Buscar não conta: o campo está no cabeçalho de toda página pública.
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
        mensagem: 'Precisa de ajuda com esta busca? Fale com o suporte e informe o termo buscado.',
        acao: montarAcaoSuporte('Codex · busca sem resultado'),
      }
    case 'erro-com-contexto':
      return {
        mensagem: contexto.temCampoRelacionado
          ? 'Corrigiu este campo? Veja os demais campos e erros do provedor.'
          : 'Resolveu este erro? Veja os demais campos e erros do provedor.',
        acao: { rotulo: 'Ver o provedor completo', href: `/provedores/${contexto.provedorSlug}` },
        acaoSecundaria: montarAcaoSuporteDeErro(contexto.codigoErro),
      }
    case 'erro-geral':
      return {
        mensagem: 'O erro continua? Fale com o suporte e informe o código.',
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
        mensagem: 'Veja como cada provedor trata os campos do layout.',
        acao: { rotulo: 'Ver os provedores', href: '/provedores' },
      }
    case 'layout-campo':
      return {
        mensagem: 'Dúvida sobre um campo do layout? Fale com o suporte e informe o nome do campo.',
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

/** Laranja sobre o azul-profundo mede 5,66:1: passa como texto pequeno. */
const CLASSE_TITULO_COLUNA = 'text-xs font-bold tracking-wider text-accent uppercase'

const PAGINAS_DO_CODEX = [
  { rotulo: 'Provedores', para: '/provedores' },
  { rotulo: 'Layout InvoiCy', para: '/layout' },
  { rotulo: 'Artigos', para: '/artigos' },
  { rotulo: 'Como funciona', para: '/como-funciona' },
] as const

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
 * Rodapé de toda página pública (nunca usado na área interna). No topo, o próximo passo do
 * contexto ou a faixa de chamado; embaixo, marca, páginas, atendimento e links da Migrate.
 */
export function RodapeContextual({ contexto, versaoVigenteDoLayout }: RodapeContextualProps) {
  const proximoPasso = obterProximoPasso(contexto)
  const { atendimento, linksMigrate } = CONTEUDO_RODAPE_CONSTANTE
  // Só lê o índice já carregado por outra tela: o rodapé não dispara requisição própria.
  const { data: indiceDoLayout } = useLayoutIndice({ buscar: false })
  const versaoVigente = formatarVersaoLayout(
    indiceDoLayout?.vigente?.rotulo ?? versaoVigenteDoLayout ?? '',
  )

  return (
    <footer className="relative isolate bg-primary text-white">
      <PontosDeLuz />

      <div className="border-b border-white/15">
        {proximoPasso ? (
          <div className="mx-auto flex max-w-pagina flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:text-left lg:px-8">
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
        ) : (
          <FaixaDeChamado chamado={atendimento.chamado} />
        )}
      </div>

      <div className="mx-auto grid max-w-pagina gap-10 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <img src="/marca/logo-migrate-branco.svg" alt="Migrate" className="h-7 w-auto" />
            <span aria-hidden="true" className="h-6 w-px bg-white/40" />
            <span className="text-lg font-extrabold">Codex</span>
          </div>
          <p className="max-w-xs text-sm text-white">
            Erros, campos e particularidades de cada provedor de NFS-e no Layout InvoiCy.
          </p>
          <p className="text-sm font-semibold italic">
            Evolua
            <PontoDeMarca /> Transforme
            <PontoDeMarca /> Movimente
            <PontoDeMarca />
          </p>
        </div>

        <nav aria-label="Páginas do Codex">
          <h2 className={CLASSE_TITULO_COLUNA}>Codex</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {PAGINAS_DO_CODEX.map((pagina) => (
              <li key={pagina.para}>
                <Link
                  to={pagina.para}
                  activeOptions={{ exact: true }}
                  className={CLASSE_LINK_RODAPE}
                >
                  {pagina.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={CLASSE_TITULO_COLUNA}>Atendimento</h2>
          <ul className="mt-4 flex flex-col gap-3">
            <li>
              <a href={`mailto:${atendimento.emailSuporte}`} className={CLASSE_LINK_RODAPE}>
                <Mail className="size-4 text-accent" aria-hidden="true" />
                {atendimento.emailSuporte}
              </a>
            </li>
            <li>
              <a href={atendimento.telefoneHref} className={CLASSE_LINK_RODAPE}>
                <Phone className="size-4 text-accent" aria-hidden="true" />
                {atendimento.telefone}
              </a>
            </li>
            <li className="inline-flex items-center gap-2 text-xs text-white">
              <Clock className="size-4 text-accent" aria-hidden="true" />
              {atendimento.horario}
            </li>
          </ul>
        </div>

        <nav aria-label="Links da Migrate">
          <h2 className={CLASSE_TITULO_COLUNA}>Migrate</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {linksMigrate.map((link) => (
              <li key={link.href}>
                <LinkExterno
                  href={link.href}
                  className={CLASSE_LINK_RODAPE}
                  classeDoIcone="size-3.5"
                >
                  {link.rotulo}
                </LinkExterno>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex max-w-pagina flex-wrap items-center justify-between gap-4 border-t border-white/15 px-4 py-6 text-xs text-white lg:px-8">
        <p>
          © {new Date().getFullYear()} Migrate
          {versaoVigente && <> · Layout InvoiCy vigente: {versaoVigente}</>}
        </p>
        {/* `#top` é tratado pelo navegador como o topo do documento, sem precisar de âncora. */}
        <a
          href="#top"
          className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
        >
          Voltar ao topo
          <ArrowUp className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </footer>
  )
}

/** Faixa padrão: toda página sem passo específico termina oferecendo o chamado. */
function FaixaDeChamado({ chamado }: { chamado: { rotulo: string; href: string } }) {
  return (
    <div className="mx-auto flex max-w-pagina flex-col items-start justify-between gap-4 px-4 py-6 sm:flex-row sm:items-center lg:px-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-subtitulo font-extrabold">Não encontrou o que procurava?</h2>
        <p className="text-sm text-white">Abra um chamado e envie o link desta página.</p>
      </div>
      <LinkExterno href={chamado.href} className={CLASSE_ACAO_PRINCIPAL} classeDoIcone="size-4">
        {chamado.rotulo}
      </LinkExterno>
    </div>
  )
}
