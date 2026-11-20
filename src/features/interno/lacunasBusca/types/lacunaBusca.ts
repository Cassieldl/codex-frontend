export type EstadoLacunaBusca = 'Aberta' | 'Resolvida' | 'Descartada'

export type OrdenacaoTermoLacunaBusca = 'ocorrencias' | 'recente' | 'termo'

/**
 * `LacunaBuscaDto` do backend - uma ocorrência registrada, como volta do `POST` e das escritas de
 * estado. As datas chegam em ISO-8601 com offset (`DateTimeOffset`).
 */
export interface LacunaBusca {
  id: number
  termo: string
  parceiro: string | null
  numeroChamado: string | null
  estado: EstadoLacunaBusca
  nota: string | null
  /** `null` quando o token de quem registrou não trazia nome. */
  registradoPorNome: string | null
  registradoEm: string
  resolvidaEm: string | null
  resolvidoPorNome: string | null
  /** Ocorrências abertas com o mesmo termo normalizado. */
  ocorrenciasAbertas: number
  versaoConcorrencia: number
}

/**
 * `LacunaBuscaTermoDto`: todas as ocorrências de um termo normalizado, numa linha só - a unidade
 * da fila editorial. As datas chegam em ISO-8601 com offset (`DateTimeOffset`).
 */
export interface LacunaBuscaTermo {
  /** Chave do grupo: minúsculas, sem acento, espaços colapsados. */
  termoNormalizado: string
  /** Como a ocorrência mais recente foi digitada. */
  termo: string
  ocorrencias: number
  primeiraEm: string
  ultimaEm: string
  /** Até 10, do mais recente ao mais antigo; `totalParceiros` conta também os que o teto cortou. */
  parceiros: string[]
  totalParceiros: number
  /** Até 10, do mais recente ao mais antigo; `totalChamados` conta também os que o teto cortou. */
  chamados: string[]
  totalChamados: number
  /** `null` quando o token de quem registrou a ocorrência mais recente não trazia nome. */
  ultimoRegistradoPorNome: string | null
  /** Ocorrência usada no `PUT /{id}/estado` para decidir o termo inteiro. */
  lacunaReferenciaId: number
  /** Token de concorrência da ocorrência de referência - vira o `If-Match`. */
  versaoConcorrencia: number
}

/** `RegistrarLacunaBuscaDto`: quem registra e quando vêm do token e do servidor, nunca do corpo. */
export interface RegistrarLacunaBuscaDto {
  termo: string
  parceiro?: string
  numeroChamado?: string
}

/** `AlterarEstadoLacunaBuscaDto`. */
export interface AlterarEstadoLacunaBuscaDto {
  estado: EstadoLacunaBusca
  nota?: string
  incluirMesmoTermo?: boolean
}

/** `AlteracaoEstadoLacunaBuscaDto`. */
export interface AlteracaoEstadoLacunaBusca {
  lacuna: LacunaBusca
  /** Outras ocorrências do mesmo termo alteradas junto (`0` sem `incluirMesmoTermo`). */
  mesmoTermoAlteradas: number
}

/** Termo da fila já com o `etag` derivado do `versaoConcorrencia`, pronto para o `If-Match`. */
export type LacunaBuscaTermoComEtag = LacunaBuscaTermo & { etag: string }

/** Tetos do validator do backend (`LimitesLacunaBusca`), medidos sobre o texto aparado. */
export const LIMITES_LACUNA_BUSCA = {
  termoMinimo: 2,
  termo: 300,
  parceiro: 160,
  numeroChamado: 60,
  nota: 500,
} as const
