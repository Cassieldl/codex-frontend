/// <reference types="vitest/config" />
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      // Testes ficam ao lado do arquivo que testam (inclusive rotas, M30) —
      // nunca devem ser tratados como rota pelo gerador do TanStack Router.
      // Character class [.] evita depender de escape de barra invertida.
      routeFileIgnorePattern: '[.](test|spec)[.][jt]sx?$',
    }),
    react(),
    tailwindcss(),
  ],
  build: {
    sourcemap: false, // rules/security.md — nunca sourcemap em produção
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // A suíte inteira dependia do `.env` do desenvolvedor, que — corretamente — não é versionado:
    // os handlers do MSW registram em `${VITE_API_URL}/...` e o cliente Axios chama a mesma
    // variável. Sem `.env`, os dois viram `undefined/...`, nada casa e o MSW recusa cada
    // requisição — 129 falhas num clone limpo, com a suíte verde na máquina de quem tinha o
    // arquivo. Fixar aqui torna o valor parte do repositório e igual em toda máquina; qual é o
    // valor não importa, importa ser o MESMO nos dois lados.
    env: {
      VITE_API_URL: 'http://localhost:5000/api/v1',
    },
    // O default de 5s do Vitest e o de 1s do Testing Library bastam para um teste isolado e
    // não bastam para os ~15 que montam router + MSW + jsdom juntos: sob a concorrência padrão
    // (99 arquivos) eles estouram por carga da máquina, não por defeito. Um gate que fica verde
    // só às vezes não é gate.
    testTimeout: 15000,
  },
})
