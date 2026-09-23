# Imagem do portal do Codex (004, PRD §2.1/A2).
#
# `VITE_*` é substituído POR DENTRO DO BUNDLE durante o build, não lido em runtime: a imagem é
# por ambiente, e promover a de staging para produção levaria a URL de staging junto (decisão D1
# do PRD). Por isso as URLs entram como build arg, e não como variável de container.

FROM node:22-alpine AS build
WORKDIR /origem

# Manifestos primeiro: enquanto o lock não mudar, a camada de dependências é reaproveitada.
COPY package.json package-lock.json ./
RUN npm ci

ARG VITE_API_URL
ARG VITE_APP_NAME=Codex
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

# Falha cedo e alto: sem isto, esquecer um build arg produz um bundle que compila, sobe e só
# quebra no navegador do usuário, apontando para `undefined`.
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL e obrigatorio no build" && exit 1)
RUN test -n "$VITE_KEYCLOAK_URL" || (echo "VITE_KEYCLOAK_URL e obrigatorio no build" && exit 1)
RUN test -n "$VITE_KEYCLOAK_REALM" || (echo "VITE_KEYCLOAK_REALM e obrigatorio no build" && exit 1)
RUN test -n "$VITE_KEYCLOAK_CLIENT_ID" || (echo "VITE_KEYCLOAK_CLIENT_ID e obrigatorio no build" && exit 1)

COPY . .

# `npm run build` é `tsc -b && vite build` — o typecheck é parte do gate, não etapa opcional.
# `tsc --noEmit` na raiz deste repo checa ZERO arquivo e sai 0 sempre (project references).
RUN npm run build

# Imagem non-root da própria NGINX: o nginx oficial sobe como root para escutar na 80, e fazê-lo
# rodar sem privilégio exige remendar permissão de diretório no Dockerfile. Esta já vem com uid
# 101 e porta 8080 (rules/security.md, least privilege).
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# O entrypoint da imagem aplica envsubst nos templates: a CSP e o proxy de API são definidos por
# variável de ambiente, sem reconstruir a imagem. `$uri` do nginx não é tocado — só `${VAR}`.
COPY --chown=nginx:nginx docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build --chown=nginx:nginx /origem/dist /usr/share/nginx/html

EXPOSE 8080
