import { ModalDeCampoNavegavel } from '../../../components/ui/ModalDeCampoNavegavel'
import { useSlugAssentadoDoCampo } from '../hooks/useUsosDoCampoLayout'
import type { ModalDoVerbeteProps } from '../types/modalDoVerbete'
import { ConteudoDoVerbete } from './ConteudoDoVerbete'

interface SelosDoVerbeteProps {
  novo: boolean
  descontinuado: boolean
  versaoRotulo: string
}

function SelosDoVerbete({ novo, descontinuado, versaoRotulo }: SelosDoVerbeteProps) {
  if (!novo && !descontinuado) return null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {novo && (
        <span className="inline-flex items-center rounded-[var(--radius-pill)] border border-dashed border-primary px-2 py-px text-aux font-semibold tracking-wide text-primary uppercase">
          novo na versão {versaoRotulo}
        </span>
      )}

      {/* Nunca só cor ou opacidade: o texto está sempre presente. */}
      {descontinuado && (
        <span className="text-aux font-semibold text-ink/70">Descontinuado nesta versão</span>
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
}: ModalDoVerbeteProps) {
  const slugAssentado = useSlugAssentadoDoCampo(campo.slug)

  return (
    <ModalDeCampoNavegavel
      titulo={campo.nome}
      chave={campo.slug}
      trilha={trilha}
      aposTitulo={
        <SelosDoVerbete
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
      <ConteudoDoVerbete campo={campo} slugAssentado={slugAssentado} />
    </ModalDeCampoNavegavel>
  )
}
