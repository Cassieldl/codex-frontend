// Callback do check-sso silencioso do keycloak-js. Repassa a URL de retorno (com o resultado do
// handshake) para a janela pai e nada mais — nenhuma rota da aplicação é montada aqui.
//
// Vive num arquivo separado, e não inline no HTML, porque a CSP de produção usa
// `script-src 'self'`: o snippet inline do exemplo oficial do keycloak-js é bloqueado pelo
// navegador, e o efeito é a verificação silenciosa NUNCA concluir — sem erro visível na tela,
// só no console. Medido no smoke ponta a ponta.
parent.postMessage(location.href, location.origin)
