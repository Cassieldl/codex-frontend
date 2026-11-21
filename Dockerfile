# Imagem do portal do Codex (004, PRD §2.1/A2).
#
# `VITE_*` é substituído POR DENTRO DO BUNDLE durante o build, não lido em runtime: a imagem é
# por ambiente, e promover a de staging para produção levaria a URL de staging junto (decisão D1
# do PRD). Por isso as URLs entram como build arg, e não como variável de container.

FROM node:22.23.5-alpine3.24 AS build
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

# `npm run build` é `tsc -b && vite build`: o typecheck é parte do gate, não etapa opcional.
# `tsc --noEmit` na raiz deste repo checa ZERO arquivo e sai 0 sempre (project references).
RUN npm run build

# Imagem non-root da própria NGINX: o nginx oficial sobe como root para escutar na 80, e fazê-lo
# rodar sem privilégio exige remendar permissão de diretório no Dockerfile. Esta já vem com uid
# 101 e porta 8080 (least privilege). Tag exata do ramo estável, puxada do GHCR da própria NGINX:
# o Docker Hub publica a mesma imagem com dias de atraso. O Dependabot do ecossistema `docker` abre
# PR quando sai versão nova, em vez de a base envelhecer calada.
FROM ghcr.io/nginx/nginx-unprivileged:1.30.7-alpine3.24 AS runtime

# Correções do Alpine que saem depois da imagem base. O nginx fica fixado no `/etc/apk/world` da
# base e não muda aqui; só as bibliotecas do sistema sobem.
USER root
RUN apk upgrade --no-cache
USER 101

# O entrypoint da imagem aplica envsubst nos templates: a CSP e o proxy de API são definidos por
# variável de ambiente, sem reconstruir a imagem. `$uri` do nginx não é tocado, só `${VAR}`.
COPY --chown=nginx:nginx docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chown=nginx:nginx docker/cabecalhos-de-seguranca.conf /etc/nginx/snippets/cabecalhos-de-seguranca.conf
COPY --chown=nginx:nginx --chmod=755 docker/10-exigir-variaveis.sh /docker-entrypoint.d/10-exigir-variaveis.sh
COPY --from=build --chown=nginx:nginx /origem/dist /usr/share/nginx/html

EXPOSE 8080
