import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import type { ProvedorHomeDto } from '../types/home'

export interface SeletorProvedorProps {
  provedores: ProvedorHomeDto[]
}

/**
 * "Ir direto a um provedor" da Home: escolhe o provedor e abre a página dele, que já mostra o
 * conteúdo. Teclado e semântica de combobox vêm do `Select` do design system.
 */
export function SeletorProvedor({ provedores }: SeletorProvedorProps) {
  const navigate = useNavigate()
  const [provedorSlug, setProvedorSlug] = useState<string | null>(null)

  function abrir() {
    if (provedorSlug === null) return
    void navigate({ to: '/provedores/$provedorSlug', params: { provedorSlug } })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-aux font-semibold uppercase tracking-wider text-muted">
        Ir direto a um provedor
      </span>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Provedor"
          placeholder="Escolha o provedor"
          options={provedores.map((provedor) => ({ value: provedor.slug, label: provedor.nome }))}
          value={provedorSlug}
          onValueChange={setProvedorSlug}
          className="w-56"
        />

        <Button onClick={abrir} disabled={provedorSlug === null}>
          Abrir
        </Button>
      </div>
    </div>
  )
}
