import { useState } from 'react'
import { useDebounce } from '../../../busca/hooks/useDebounce'
import { useCamposLayoutPorVersao } from '../../camposLayout/hooks/useCamposLayoutPorVersao'
import { useVersoesLayout } from '../../camposLayout/hooks/useVersoesLayout'
import type { VersaoLayoutAdmin } from '../../camposLayout/types/versaoLayoutAdmin'
import { useErrosAdmin } from '../../erros/hooks/useErrosAdmin'
import type { BuscaDeErrosDoArtigo, CamposLayoutDoArtigo } from '../types/referenciasArtigo'

export const ATRASO_DA_BUSCA_DE_ERROS_MS = 300

/** A busca mostra o começo do resultado; achar um erro específico é papel do termo. */
export const TAMANHO_PAGINA_BUSCA_DE_ERROS = 20

const TAMANHO_PAGINA_VERSOES_LAYOUT = 200

function versaoMaisRecente(versoes: readonly VersaoLayoutAdmin[]): VersaoLayoutAdmin | undefined {
  return versoes.reduce<VersaoLayoutAdmin | undefined>(
    (maior, versao) => (!maior || versao.ordem > maior.ordem ? versao : maior),
    undefined,
  )
}

/**
 * Fontes das referências cruzadas do formulário de artigo: erros por busca no servidor e campos do
 * layout por versão. Mora na página, não no formulário, porque o formulário remonta a cada artigo
 * aberto e levaria o debounce junto. `chaveDoFormulario` limpa o termo quando outro artigo abre.
 */
export function useReferenciasDoArtigo(chaveDoFormulario: string | null): {
  buscaDeErros: BuscaDeErrosDoArtigo
  camposLayout: CamposLayoutDoArtigo
} {
  const [termo, setTermo] = useState('')
  const [chaveAnterior, setChaveAnterior] = useState(chaveDoFormulario)
  const [versaoEscolhidaId, setVersaoEscolhidaId] = useState<number | null>(null)

  if (chaveDoFormulario !== chaveAnterior) {
    setChaveAnterior(chaveDoFormulario)
    setTermo('')
  }

  const termoComAtraso = useDebounce(termo.trim(), ATRASO_DA_BUSCA_DE_ERROS_MS)
  const erros = useErrosAdmin({
    q: termoComAtraso || undefined,
    tamanhoPagina: TAMANHO_PAGINA_BUSCA_DE_ERROS,
  })

  const versoes = useVersoesLayout({ tamanhoPagina: TAMANHO_PAGINA_VERSOES_LAYOUT })
  const listaDeVersoes = versoes.data?.items ?? []
  const versaoSelecionadaId = versaoEscolhidaId ?? versaoMaisRecente(listaDeVersoes)?.id ?? null
  const rotuloDaVersao = listaDeVersoes.find((versao) => versao.id === versaoSelecionadaId)?.rotulo
  const campos = useCamposLayoutPorVersao(versaoSelecionadaId ?? 0)

  return {
    buscaDeErros: {
      termo,
      onTermoChange: setTermo,
      resultados: (erros.data?.items ?? []).map((erro) => ({
        id: erro.id,
        codigo: erro.codigo,
        titulo: erro.titulo,
        desativado: false,
      })),
      totalEncontrado: erros.data?.totalCount ?? 0,
      isBuscando: erros.isFetching || termo.trim() !== termoComAtraso,
      isError: erros.isError,
    },
    camposLayout: {
      versoes: listaDeVersoes.map((versao) => ({ id: versao.id, rotulo: versao.rotulo })),
      versaoSelecionadaId,
      onVersaoChange: setVersaoEscolhidaId,
      campos: (campos.data ?? []).map((campo) => ({
        id: campo.id,
        nome: campo.nome,
        caminhoXml: campo.caminhoXml,
        versaoLayoutId: versaoSelecionadaId ?? 0,
        versaoLayoutRotulo: rotuloDaVersao ?? '',
        desativado: false,
      })),
      isLoading: versoes.isLoading || campos.isLoading,
      isError: versoes.isError || campos.isError,
    },
  }
}
