import { ModalDeCampoNavegavel } from '../../../components/ui/ModalDeCampoNavegavel'
import { useSlugAssentadoDoCampo } from '../hooks/useUsosDoCampoLayout'
import type { ModalDoVerbeteProps } from '../types/modalDoVerbete'
import { ConteudoDoVerbete } from './ConteudoDoVerbete'
import {
  NOME_DA_REFORMA_TRIBUTARIA,
  SeloReformaTributaria,
} from '../../../components/ui/SeloReformaTributaria'

interface SelosDoVerbeteProps {
  reformaTributaria: boolean
  novo: boolean
  descontinuado: boolean
  versaoRotulo: string
}

function SelosDoVerbete({
  reformaTributaria,
  novo,
  descontinuado,
  versaoRotulo,
}: SelosDoVerbeteProps) {
  if (!reformaTributaria && !novo && !descontinuado) return null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {reformaTributaria && (
        <span className="inline-flex items-center gap-2">
          <SeloReformaTributaria />
          <span aria-hidden="true" className="text-aux text-muted">
            {NOME_DA_REFORMA_TRIBUTARIA}
          </span>
        </span>
      )}

      {novo && (
        <span className="inline-flex items-center rounded-[var(--radius-pill)] border border-dashed border-primary px-2 py-px text-aux font-semibold tracking-wide text-primary uppercase">
          novo na versão {versaoRotulo}
        </span>
      )}

      {/* Nunca só cor ou opacidade: o texto está sempre presente. */}
      {descontinuado && (
        <span className="text-aux font-semibold text-muted">Descontinuado nesta versão</span>
      )}
    </div>
  )
}

/**
 * Detalhe do campo do layout em modal. A navegação, o link e o rodapé são do
 * `ModalDeCampoNavegavel`; aqui ficam os selos e o conteúdo do verbete. O atraso da consulta dos
 * usos mora aqui porque este componente persiste entre campos e o conteúdo, não.
 */
export function ModalDoVerbete({
  campo,
  trilha,
  versaoRotulo,
  posicao,
  total,
  filtroAtivo,
  anterior,
  proximo,
  onNavegar,
  onFechar,
  devolverFoco,
  linkDoCampo,
  estrutura,
}: ModalDoVerbeteProps) {
  const slugAssentado = useSlugAssentadoDoCampo(campo.slug)

  return (
    <ModalDeCampoNavegavel
      titulo={campo.nome}
      chave={campo.slug}
      trilha={trilha}
      aposTitulo={
        <SelosDoVerbete
          reformaTributaria={campo.reformaTributaria}
          novo={campo.novoNestaVersao}
          descontinuado={campo.descontinuadoNestaVersao}
          versaoRotulo={versaoRotulo}
        />
      }
      posicao={posicao}
      total={total}
      filtroAtivo={filtroAtivo}
      anterior={anterior}
      proximo={proximo}
      onNavegar={onNavegar}
      onFechar={onFechar}
      devolverFoco={devolverFoco}
      linkDoCampo={linkDoCampo}
    >
      <ConteudoDoVerbete campo={campo} slugAssentado={slugAssentado} estrutura={estrutura} />
    </ModalDeCampoNavegavel>
  )
}
