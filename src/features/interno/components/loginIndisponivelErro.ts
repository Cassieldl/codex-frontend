/** Sinaliza ao guard da área interna que o Keycloak não respondeu ao check-sso. */
export class LoginIndisponivelErro extends Error {
  constructor() {
    super('O serviço de login não respondeu.')
    this.name = 'LoginIndisponivelErro'
  }
}
