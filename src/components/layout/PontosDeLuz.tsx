/**
 * Pontos de luz do fundo escuro do Design System: dois círculos azul-claro em blur, um no canto
 * superior direito e outro no inferior esquerdo. O pai precisa de `relative isolate`.
 *
 * O recorte fica nesta camada, não no pai: um `overflow-hidden` no cabeçalho cortaria a prévia
 * da busca e o dropdown de provedor, que abrem para fora dele.
 */
export function PontosDeLuz() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-[200px] -right-[130px] size-[560px] rounded-pill bg-primary-light/30 blur-[130px]" />
      <div className="absolute -bottom-[220px] -left-[120px] size-[420px] rounded-pill bg-primary-light/20 blur-[120px]" />
    </div>
  )
}
