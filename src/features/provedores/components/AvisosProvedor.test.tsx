import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AvisoPublico } from '../types/provedor'
import { AvisosProvedor } from './AvisosProvedor'
import { AvisosVersao } from './AvisosVersao'

const avisoDeProvedor: AvisoPublico = {
  severidade: 'Alerta',
  titulo: 'Certificado digital expira em breve',
  corpo: 'Renove o certificado A1 antes do vencimento.',
  vigenciaInicio: '2026-08-01T00:00:00Z',
  escopo: 'provedor',
  camposAfetados: [],
}

describe('AvisosProvedor', () => {
  it('renderiza a seção "Avisos do provedor" com o subtítulo fixo', () => {
    render(<AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />)

    expect(screen.getByRole('heading', { name: 'Avisos do provedor' })).toBeInTheDocument()
    expect(
      screen.getByText('Valem para Prefeitura de Exemplo em qualquer versão.'),
    ).toBeInTheDocument()
    expect(screen.getByText(avisoDeProvedor.titulo)).toBeInTheDocument()
  })

  it('não renderiza nada quando a lista de avisos está vazia', () => {
    const { container } = render(
      <AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[]} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('nunca mistura com os avisos de versão — títulos de seção distintos', () => {
    const avisoDeVersao: AvisoPublico = {
      ...avisoDeProvedor,
      escopo: 'versao',
      titulo: 'Campo InscricaoMunicipal mudou de tamanho nesta versão',
    }

    render(
      <>
        <AvisosProvedor nomeProvedor="Prefeitura de Exemplo" avisos={[avisoDeProvedor]} />
        <AvisosVersao avisos={[avisoDeVersao]} />
      </>,
    )

    expect(screen.getByRole('heading', { name: 'Avisos do provedor' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Avisos desta versão' })).toBeInTheDocument()
    expect(screen.getByText(avisoDeProvedor.titulo)).toBeInTheDocument()
    expect(screen.getByText(avisoDeVersao.titulo)).toBeInTheDocument()
  })
})
