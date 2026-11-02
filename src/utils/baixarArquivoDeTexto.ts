/** Baixa um texto gerado na própria página, sem ir ao servidor. */
export function baixarArquivoDeTexto(nomeDoArquivo: string, conteudo: string, tipoMime: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipoMime};charset=utf-8` }))
  const ancora = document.createElement('a')
  ancora.href = url
  ancora.download = nomeDoArquivo
  document.body.appendChild(ancora)
  ancora.click()
  ancora.remove()
  // Revogar no mesmo tique pode cancelar o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Nome de arquivo seguro a partir de um rótulo livre ("4.12" fica, "8 (prévia)" vira "8-previa"). */
export function rotuloParaNomeDeArquivo(rotulo: string): string {
  const semAcento = rotulo.normalize('NFD').replace(/[̀-ͯ]/g, '')
  const seguro = semAcento
    .replace(/[^A-Za-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return seguro === '' ? 'versao' : seguro
}
