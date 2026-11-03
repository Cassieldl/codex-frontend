import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { Modal } from './Modal'

export interface ImagemDoArtigoProps {
  /** Já validado por `caminhoDeImagemSeguro`: este componente não filtra endereço. */
  src: string
  alt: string
  legenda?: string | null
}

/** Imagem do corpo com legenda; o botão abre a versão ampliada e o foco volta a ele ao fechar. */
export function ImagemDoArtigo({ src, alt, legenda }: ImagemDoArtigoProps) {
  const [ampliada, setAmpliada] = useState(false)
  const textoDaLegenda = legenda?.trim() || alt.trim() || 'Imagem'

  return (
    <figure className="my-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setAmpliada(true)}
        aria-label={`Ampliar imagem: ${textoDaLegenda}`}
        className="group relative block w-fit max-w-full cursor-zoom-in rounded-[var(--radius-control)] border border-line bg-white p-1 hover:shadow-hover"
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="max-h-[480px] w-auto max-w-full rounded-[var(--radius-control)]"
        />
        <ZoomIn
          className="absolute right-2 bottom-2 size-6 rounded-full bg-white p-1 text-primary-medium shadow-card"
          aria-hidden="true"
        />
      </button>
      <figcaption className="text-xs text-muted">{textoDaLegenda}</figcaption>

      <Modal
        isOpen={ampliada}
        onClose={() => setAmpliada(false)}
        title={textoDaLegenda}
        size="lg"
        focoInicial="dialogo"
      >
        <img src={src} alt={alt} className="mx-auto max-h-[75vh] w-auto max-w-full" />
      </Modal>
    </figure>
  )
}
