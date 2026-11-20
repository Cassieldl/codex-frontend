import { render, screen } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { extrairErrosDeCampo } from '../../../utils/handleApiError'
import { useErrosDeCampoDoServidor } from './useErrosDeCampoDoServidor'

/**
 * Prova a travessia inteira do `details[]`: o backend monta os erros por campo declaradamente
 * para o cliente, e até aqui ninguém os lia - o editor via só "Um ou mais campos são inválidos."
 *
 * É a terceira ocorrência do padrão "junção de contrato sem dono" nesta base: cada lado tinha a
 * própria metade certa e ninguém testava a passagem.
 */
describe('useErrosDeCampoDoServidor', () => {
  interface Valores {
    titulo: string
    expiraEm: string
  }

  const CAMPOS = ['titulo', 'expiraEm'] as const

  function erro422(details: { field: string; message: string }[]): AxiosError {
    return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, null, {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
      data: {
        error: { code: 'VALIDATION_ERROR', message: 'Um ou mais campos são inválidos.', details },
      },
    })
  }

  function Formulario({ erro }: { erro: unknown }) {
    const {
      setError,
      formState: { errors },
    } = useForm<Valores>({ defaultValues: { titulo: '', expiraEm: '' } })

    // Guardar a lista é responsabilidade do chamador - os três de produção fazem isso no estado
    // do `onError`. Derivar na renderização, como este teste fazia antes, criava array novo a cada
    // render e punha o efeito em laço: o worker morria por memória antes do primeiro caso.
    const errosDeCampo = useMemo(() => extrairErrosDeCampo(erro), [erro])

    useErrosDeCampoDoServidor(setError, CAMPOS, errosDeCampo)

    return (
      <div>
        <p>titulo: {errors.titulo?.message ?? '-'}</p>
        <p>expiraEm: {errors.expiraEm?.message ?? '-'}</p>
      </div>
    )
  }

  it('destaca o campo que o backend apontou, com a mensagem dele', async () => {
    render(
      <Formulario erro={erro422([{ field: 'ExpiraEm', message: 'A expiração já passou.' }])} />,
    )

    expect(await screen.findByText('expiraEm: A expiração já passou.')).toBeInTheDocument()
    expect(screen.getByText('titulo: -')).toBeInTheDocument()
  })

  it('casa o nome do campo ignorando a caixa - o backend usa PascalCase, o form camelCase', async () => {
    render(<Formulario erro={erro422([{ field: 'Titulo', message: 'Título obrigatório.' }])} />)

    expect(await screen.findByText('titulo: Título obrigatório.')).toBeInTheDocument()
  })

  it('ignora campo que não existe no formulário, sem quebrar os outros', async () => {
    render(
      <Formulario
        erro={erro422([
          { field: 'CampoQueNaoExisteAqui', message: 'Ignorado.' },
          { field: 'titulo', message: 'Este vale.' },
        ])}
      />,
    )

    expect(await screen.findByText('titulo: Este vale.')).toBeInTheDocument()
  })

  it('erro sem details não marca campo nenhum', () => {
    render(<Formulario erro={erro422([])} />)

    expect(screen.getByText('titulo: -')).toBeInTheDocument()
    expect(screen.getByText('expiraEm: -')).toBeInTheDocument()
  })
})

describe('useErrosDeCampoDoServidor: não re-dispara com array novo a cada render', () => {
  interface Valores {
    titulo: string
  }

  /**
   * Detector do laço: o chamador real deriva a lista na renderização, então o array chega novo
   * toda vez. Com a dependência na identidade do array, `setError` re-renderizava, o array vinha
   * novo, o efeito rodava outra vez - e o processo morria por memória **antes** do primeiro
   * teste, o que aparece como worker derrubado e não como asserção vermelha.
   *
   * Contar renderizações transforma esse travamento num teste que falha de forma legível.
   */
  it('remarca o campo quando o MESMO erro chega duas vezes', async () => {
    // O editor tenta salvar de novo sem mudar nada: a resposta é idêntica, mas o RHF já limpou os
    // erros de servidor na revalidação. Se o hook dependesse do CONTEÚDO, a segunda resposta não
    // remarcaria e o destaque sumiria - sobrando só o "um ou mais campos são inválidos".
    function Formulario({ tentativa }: { tentativa: number }) {
      const {
        setError,
        clearErrors,
        formState: { errors },
      } = useForm<{ titulo: string }>({ defaultValues: { titulo: '' } })

      // Reproduz o que `handleSubmit` do RHF faz de verdade na revalidação: a validação Zod
      // passa (o título não está mais vazio) e o erro de servidor do campo é limpo ANTES de a
      // nova resposta chegar e o efeito do hook rodar de novo. Sem este passo, o texto do
      // primeiro erro nunca some do DOM e a asserção final passa mesmo que o hook não remarque
      // nada - que era exatamente o defeito do ISSUE-QA-1.
      useEffect(() => {
        clearErrors('titulo')
      }, [tentativa, clearErrors])

      // Lista nova por tentativa, com o MESMO conteúdo - é o que o `onError` produz.
      const errosDeCampo = useMemo(
        () => [{ field: 'titulo', message: 'Já existe um comunicado com este título.' }],
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `tentativa` não é lida, mas gera a lista nova do teste
        [tentativa],
      )

      useErrosDeCampoDoServidor(setError, ['titulo'] as const, errosDeCampo)

      return <p>titulo: {errors.titulo?.message ?? '-'}</p>
    }

    const { rerender } = render(<Formulario tentativa={1} />)
    expect(await screen.findByText(/Já existe um comunicado/)).toBeInTheDocument()

    rerender(<Formulario tentativa={2} />)

    // Se a busca por "chega o texto" fosse feita antes de o efeito de limpeza correr, a
    // asserção passaria mesmo com o hook quebrado (é o que acontecia antes). `findByText`
    // espera o DOM assentar depois de todos os efeitos da renderização - inclusive o
    // `clearErrors` - antes de decidir.
    expect(await screen.findByText(/Já existe um comunicado/)).toBeInTheDocument()
  })

  it('estabiliza em poucas renderizações', async () => {
    let renderizacoes = 0

    function Formulario() {
      renderizacoes += 1
      const {
        setError,
        formState: { errors },
      } = useForm<Valores>({ defaultValues: { titulo: '' } })

      const errosDeCampo = useMemo(() => [{ field: 'titulo', message: 'Título obrigatório.' }], [])

      useErrosDeCampoDoServidor(setError, ['titulo'] as const, errosDeCampo)

      return <p>titulo: {errors.titulo?.message ?? '-'}</p>
    }

    render(<Formulario />)

    expect(await screen.findByText('titulo: Título obrigatório.')).toBeInTheDocument()
    expect(renderizacoes).toBeLessThan(10)
  })
})
