#!/bin/sh
# Roda antes do envsubst do entrypoint da imagem. Variável de template ausente não é substituída e
# chega ao nginx como `${CSP_FRAME_SRC}` literal: ele lê como variável própria inexistente e morre
# com "unknown csp_frame_src variable", sem dizer qual configuração faltou.
set -e

faltando=""
for variavel in CSP_CONNECT_SRC CSP_FRAME_SRC; do
    eval "valor=\${$variavel:-}"
    [ -n "$valor" ] || faltando="$faltando $variavel"
done

if [ -n "$faltando" ]; then
    echo "Variáveis obrigatórias do portal não definidas:$faltando (ver .env.production.example)" >&2
    exit 1
fi
