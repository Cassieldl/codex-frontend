# Codex — Frontend

[![CI](https://github.com/Cassieldl/codex-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Cassieldl/codex-frontend/actions/workflows/ci.yml)

Portal Técnico de Integração NFS-e (Migrate). Aplicação standalone com identidade visual
própria (Migrate Design System) — não usa o design system do BMS e não roda dentro do BMS Core.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4 (tokens do Migrate Design System em `src/styles/global.css`)
- TanStack Router (file-based) + TanStack Query
- React Hook Form + Zod
- Axios
- date-fns
- Lucide (ícones)
- Keycloak (`keycloak-js`) — autenticação da área interna
- Vitest + Testing Library + MSW (testes)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Scripts

| Script                 | O que faz                                   |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Sobe o servidor de desenvolvimento (Vite)   |
| `npm run build`        | `tsc -b` (checagem de tipos) + `vite build` |
| `npm run preview`      | Serve o build de produção localmente        |
| `npm run test`         | Roda a suíte de testes (Vitest) uma vez     |
| `npm run test:watch`   | Roda a suíte de testes em modo watch        |
| `npm run format`       | Formata o projeto com Prettier              |
| `npm run format:check` | Confere a formatação sem alterar arquivos   |
| `npm run lint`         | ESLint sem tolerar warning                  |
| `npm run lint:fix`     | ESLint corrigindo o que for automático      |
| `npm run typecheck`    | Checagem de tipos (`tsc -b`)                |

O `npm install` instala o hook de pre-commit, que roda Prettier e ESLint nos arquivos staged.

## Variáveis de ambiente

| Variável                  | Descrição                                                                |
| ------------------------- | ------------------------------------------------------------------------ |
| `VITE_API_URL`            | Base URL da API do `codex-backend` (ex.: `http://localhost:5000/api/v1`) |
| `VITE_APP_NAME`           | Nome exibido da aplicação                                                |
| `VITE_KEYCLOAK_URL`       | URL do servidor Keycloak                                                 |
| `VITE_KEYCLOAK_REALM`     | Realm do Keycloak                                                        |
| `VITE_KEYCLOAK_CLIENT_ID` | Client ID do frontend no Keycloak                                        |

Nunca commitar `.env` — apenas `.env.example` com valores fictícios. Todo `VITE_*` é público no
bundle final; nenhum secret deve viver aqui.

## Produção (imagem Docker)

A imagem (`Dockerfile`) é por ambiente: os `VITE_*` entram como `--build-arg` e ficam gravados no
bundle — trocar depois não muda o que já foi construído. O build falha se faltar algum.

```bash
docker build -t codex-portal \n  --build-arg VITE_API_URL=https://codex-api.exemplo.com.br/api/v1 \n  --build-arg VITE_KEYCLOAK_URL=https://auth.exemplo.com.br \n  --build-arg VITE_KEYCLOAK_REALM=<realm> \n  --build-arg VITE_KEYCLOAK_CLIENT_ID=codex-front .
```

O container (nginx sem privilégio, porta 8080) lê em runtime as origens da política de segurança.
Sem qualquer uma delas ele recusa subir e diz qual faltou:

| Variável          | Uso                                                                               |
| ----------------- | --------------------------------------------------------------------------------- |
| `CSP_CONNECT_SRC` | Origens que o navegador pode chamar: API e Keycloak. Sem elas o login é bloqueado |
| `CSP_FRAME_SRC`   | Origem do Keycloak, cujo iframe oculto verifica a sessão                          |

Valores de exemplo em `.env.production.example`; guia completo de produção no `docs/producao.md` do
`codex-backend`.

## Estrutura

```text
src/
├── auth/               # keycloak.ts, authStore.ts — autenticação da área interna
├── components/ui/      # Primitivos de UI (Button, Input, Modal, Pagination...)
├── components/layout/  # Layout (cabeçalho, rodapé, layout interno)
├── features/<dominio>/ # Módulo por feature (components/hooks/services/types)
├── routes/             # Rotas file-based do TanStack Router
├── services/           # api.ts (cliente público) e apiInterno.ts (cliente autenticado)
├── styles/global.css   # Tokens do Migrate Design System (@theme, Tailwind v4)
├── test/               # setup.ts, mocks (MSW)
└── utils/              # Funções utilitárias puras (handleApiError, etc.)
```

## Autenticação

Dois clientes Axios: `apiPublico` (nunca injeta `Authorization`) e `apiInterno` (injeta o token
Keycloak e anexa `If-Match` nas mutações). A área `/interno` é protegida por um guard de rota
(`routes/interno/_autenticado.tsx`) que redireciona para `/interno/entrar` preservando o destino.
O login não tem formulário de credencial próprio — dispara o redirect hospedado do Keycloak.
