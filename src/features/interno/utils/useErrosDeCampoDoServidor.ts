import { useEffect } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ErroDeCampoApi } from '../../../utils/handleApiError'

/**
 * Aplica no formulário os erros por campo que o `422 VALIDATION_ERROR` devolve.
 *
 * O backend monta o `details[]` declaradamente para isto, e sem consumidor o editor via apenas
 * "Um ou mais campos são inválidos." - sem saber qual. O caminho realista não é exótico: escolher
 * uma expiração para daqui a poucos minutos e levar mais tempo que isso preenchendo o formulário
 * já produz um 422 que só o servidor sabe explicar.
 *
 * O casamento do nome é insensível a caixa porque o backend nomeia o campo em `PascalCase` e o
 * formulário em `camelCase`; campo que não existe no formulário é ignorado, e a mensagem geral
 * continua aparecendo na faixa de erro.
 */
export function useErrosDeCampoDoServidor<T extends FieldValues>(
  setError: UseFormSetError<T>,
  campos: readonly Path<T>[],
  errosDeCampo?: ErroDeCampoApi[],
) {
  // Dependência pela IDENTIDADE do array, de propósito: cada resposta de erro produz uma lista
  // nova, então **dois 422 idênticos seguidos remarcam o campo** - que é justamente o caso em que
  // o editor tenta salvar de novo sem mudar nada. Depender do conteúdo faria a segunda tentativa
  // não remarcar, e o destaque sumiria depois que o RHF limpa os erros de servidor na revalidação.
  //
  // O preço é que o chamador precisa manter a lista estável entre renderizações - os três de
  // produção já fazem isso, guardando o erro em estado no `onError`.
  useEffect(() => {
    if (!errosDeCampo?.length) return

    for (const erro of errosDeCampo) {
      const campo = campos.find((nome) => nome.toLowerCase() === erro.field.toLowerCase())
      if (campo) setError(campo, { type: 'server', message: erro.message })
    }
    // `campos` é lido aqui mas NÃO dispara o efeito: é a lista estática de nomes do formulário,
    // que não muda em tempo de execução. Mantê-la nas dependências transforma qualquer chamador
    // que a escreva inline (`['titulo'] as const`) num laço - efeito → setError → re-render →
    // array novo → efeito. Quem dispara é a resposta de erro, e só ela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errosDeCampo, setError])
}
