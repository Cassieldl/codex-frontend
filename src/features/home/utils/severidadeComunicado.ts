import type { Severidade } from '../../../components/ui/EtiquetaSeveridade'
import type { SeveridadeComunicado } from '../types/home'

/**
 * O contrato de P9 usa `PascalCase` (`'Critico'`), o `EtiquetaSeveridade` do
 * design system usa `lowercase` (`'critico'`). A tradução vive aqui, num
 * `Record` exaustivo - severidade nova no contrato quebra o build em vez de
 * cair num `default` silencioso.
 */
export const SEVERIDADE_ETIQUETA: Record<SeveridadeComunicado, Severidade> = {
  Critico: 'critico',
  Alerta: 'alerta',
  Informativo: 'informativo',
}

/** Rótulo do alvo do comunicado - `provedorNome` é `null` só em `Global` (§5.D.2). */
export function rotuloAlvoComunicado(provedorNome: string | null): string {
  return provedorNome ?? 'Todos os provedores'
}
