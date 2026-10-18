/** Só contador e horário: nada da sessão vai para o storage. */
interface RegistroDeRetornos {
  contador: number
  desde: number
}

const CHAVE_DO_REGISTRO = 'codex:retornos-ao-login'

/** Retornos ao login dentro da janela a partir dos quais o ciclo é tratado como laço. */
export const RETORNOS_QUE_CARACTERIZAM_LACO = 3

/** Uma sessão que expira de verdade volta ao login poucas vezes por hora, nunca três em dois minutos. */
export const JANELA_DO_LACO_MS = 2 * 60 * 1000

function ehRegistroDeRetornos(valor: unknown): valor is RegistroDeRetornos {
  if (typeof valor !== 'object' || valor === null) return false
  const registro = valor as Record<string, unknown>
  return typeof registro.contador === 'number' && typeof registro.desde === 'number'
}

// Storage bloqueado pelo navegador não pode derrubar o login: sem registro, não há laço detectado.
function lerRegistro(): RegistroDeRetornos | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_DO_REGISTRO)
    if (!bruto) return null
    const valor: unknown = JSON.parse(bruto)
    return ehRegistroDeRetornos(valor) ? valor : null
  } catch {
    return null
  }
}

function gravarRegistro(registro: RegistroDeRetornos): void {
  try {
    sessionStorage.setItem(CHAVE_DO_REGISTRO, JSON.stringify(registro))
  } catch {
    // Sem storage a proteção fica desligada, e o login segue funcionando.
  }
}

/** Conta uma volta ao login causada por sessão recusada ou não renovada. */
export function registrarRetornoAoLogin(agora: number = Date.now()): void {
  const anterior = lerRegistro()
  const dentroDaJanela = anterior !== null && agora - anterior.desde <= JANELA_DO_LACO_MS

  gravarRegistro(
    dentroDaJanela
      ? { contador: anterior.contador + 1, desde: anterior.desde }
      : { contador: 1, desde: agora },
  )
}

/**
 * Laço: a API recusa todo token enquanto a sessão SSO segue viva, e cada volta ao login entra de
 * novo sozinha. Sem esta parada, a página recarrega sem fim.
 */
export function estaEmLacoDeRetorno(agora: number = Date.now()): boolean {
  const registro = lerRegistro()
  if (registro === null) return false
  return (
    agora - registro.desde <= JANELA_DO_LACO_MS &&
    registro.contador >= RETORNOS_QUE_CARACTERIZAM_LACO
  )
}

export function esquecerRetornosAoLogin(): void {
  try {
    sessionStorage.removeItem(CHAVE_DO_REGISTRO)
  } catch {
    // Nada a limpar quando o storage está bloqueado.
  }
}
