import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import type { ProvedorHomeDto } from '../types/home'

export interface SeletorProvedorVersaoProps {
  provedores: ProvedorHomeDto[]
}

const SEM_VERSAO_PUBLICADA = 'Sem versões publicadas'

/**
 * "Ir direto a uma versão — escolha o provedor primeiro" (artboard da Home).
 *
 * O widget só é possível porque `ProvedorHomeDto` carrega `versoes` inteira
 * (decisão de contrato da Rodada 4, que substituiu `outrasVersoes: number`):
 * uma contagem popularia o texto da tela, nunca o `<Select>`. **Nenhuma opção
 * é derivada, inferida ou montada a partir de padrão de slug** — o que está na
 * lista é exatamente o que o backend publicou.
 *
 * Teclado e semântica de combobox vêm do `Select` do design system — nada é
 * reimplementado aqui.
 */
export function SeletorProvedorVersao({ provedores }: SeletorProvedorVersaoProps) {
  const navigate = useNavigate()
  const [provedorSlug, setProvedorSlug] = useState<string | null>(null)
  const [versaoSlug, setVersaoSlug] = useState<string | null>(null)

  const provedorEscolhido = provedores.find((provedor) => provedor.slug === provedorSlug) ?? null
  const versoes = provedorEscolhido?.versoes ?? []

  function escolherProvedor(slug: string) {
    setProvedorSlug(slug)
    // A versão mais recente já vem primeiro (§5.D.3) — deixá-la pré-escolhida
    // torna o caminho de um clique possível sem esconder as demais.
    const proximo = provedores.find((provedor) => provedor.slug === slug)
    // O `?.` precisa cobrir `versoes` também: protegendo só `proximo`, um item sem o campo
    // lança ao indexar — e aqui o `?? []` da linha de cima não alcança.
    setVersaoSlug(proximo?.versoes?.[0]?.slug ?? null)
  }

  const podeAbrir = provedorSlug !== null && versaoSlug !== null

  function abrir() {
    if (provedorSlug === null || versaoSlug === null) return
    navigate({ to: '/provedores/$provedorSlug/$versaoSlug', params: { provedorSlug, versaoSlug } })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-aux font-semibold uppercase tracking-wider text-muted">
        Ir direto a uma versão — escolha o provedor primeiro
      </span>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Provedor"
          placeholder="Escolha o provedor"
          options={provedores.map((provedor) => ({ value: provedor.slug, label: provedor.nome }))}
          value={provedorSlug}
          onValueChange={escolherProvedor}
          className="w-56"
        />

        <Select
          label="Versão"
          placeholder={
            provedorEscolhido && versoes.length === 0 ? SEM_VERSAO_PUBLICADA : 'Escolha a versão'
          }
          options={versoes.map((versao) => ({ value: versao.slug, label: versao.rotulo }))}
          value={versaoSlug}
          onValueChange={setVersaoSlug}
          disabled={versoes.length === 0}
          className="w-40"
        />

        <Button onClick={abrir} disabled={!podeAbrir}>
          Abrir
        </Button>
      </div>
    </div>
  )
}
