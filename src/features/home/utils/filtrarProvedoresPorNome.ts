interface ProvedorComNome {
  nome: string
}

/** Sem acento e sem caixa: "joao" acha "João Pessoa", "iss" acha "ISS.NET". */
function normalizarNome(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function filtrarProvedoresPorNome<T extends ProvedorComNome>(
  provedores: T[],
  filtro: string,
): T[] {
  const termo = normalizarNome(filtro)
  if (!termo) return provedores

  return provedores.filter((provedor) => normalizarNome(provedor.nome).includes(termo))
}
