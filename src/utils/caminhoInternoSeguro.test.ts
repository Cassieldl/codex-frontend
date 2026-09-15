import { describe, expect, it } from 'vitest'
import { caminhoInternoSeguro } from './caminhoInternoSeguro'

// Caracteres de controle construídos via charCode (não literais no fonte)
// pelo mesmo motivo do util: evitar bytes de controle "crus" no arquivo.
const TAB = String.fromCharCode(9)
const LF = String.fromCharCode(10)
const CR = String.fromCharCode(13)
const NUL = String.fromCharCode(0)
const DEL = String.fromCharCode(127)

// `caminhoInternoSeguro` é a defesa em profundidade do BAIXO-02: fecha o
// sink (`<Link to>`/`<a href>`/`navigate({ href })`) para o caso hipotético
// de a API devolver um `url` fora do formato garantido pelo backend
// (BACK-2/BACK-3 — value object `Slug`). Os casos hostis abaixo replicam a
// tabela de verificação empírica da auditoria de segurança (rodadas 2 e 3).
describe('caminhoInternoSeguro — defesa em profundidade contra open redirect (BAIXO-02)', () => {
  it('sem caminho, retorna undefined', () => {
    expect(caminhoInternoSeguro(undefined)).toBeUndefined()
    expect(caminhoInternoSeguro(null)).toBeUndefined()
    expect(caminhoInternoSeguro('')).toBeUndefined()
  })

  it('URL absoluta externa (https://evil.com/x) é rejeitada', () => {
    expect(caminhoInternoSeguro('https://evil.com/x')).toBeUndefined()
  })

  it('URL absoluta com barra única (https:/evil.com) é rejeitada', () => {
    expect(caminhoInternoSeguro('https:/evil.com')).toBeUndefined()
  })

  it('protocol-relative (//evil.com/x) é rejeitado', () => {
    expect(caminhoInternoSeguro('//evil.com/x')).toBeUndefined()
  })

  it('variação com backslash (/\\evil.com) é rejeitada', () => {
    expect(caminhoInternoSeguro('/\\evil.com')).toBeUndefined()
  })

  it('esquema javascript: é rejeitado (não começa com "/")', () => {
    expect(caminhoInternoSeguro('javascript:alert(1)')).toBeUndefined()
    expect(caminhoInternoSeguro('JaVaScRiPt:alert(1)')).toBeUndefined()
  })

  it('esquema data: é rejeitado (não começa com "/")', () => {
    expect(caminhoInternoSeguro('data:text/html,<script>alert(1)</script>')).toBeUndefined()
  })

  it('caminho interno relativo (/erros/e0117-ipm) é preservado', () => {
    expect(caminhoInternoSeguro('/erros/e0117-ipm')).toBe('/erros/e0117-ipm')
  })

  it('caminho interno com query string é preservado', () => {
    expect(caminhoInternoSeguro('/busca?provedor=betha')).toBe('/busca?provedor=betha')
  })

  // BAIXO-03 (rodada 3): o parser de URL do navegador remove TAB/LF/CR de
  // qualquer posição antes de interpretar a URL — "/<TAB>/evil.com" colapsa
  // para "//evil.com" (protocol-relative) DEPOIS que os `startsWith` já
  // rodaram sobre a string como recebida. Rejeitar controles C0 e DEL antes
  // de qualquer `startsWith` fecha a classe inteira.
  it('TAB (U+0009) em qualquer posição é rejeitado — bypass confirmado na auditoria', () => {
    expect(caminhoInternoSeguro(`/${TAB}/evil.com`)).toBeUndefined()
    expect(caminhoInternoSeguro(`/${TAB}\\evil.com`)).toBeUndefined()
    expect(caminhoInternoSeguro(`/${TAB}${TAB}/evil.com`)).toBeUndefined()
  })

  it('LF (U+000A) em qualquer posição é rejeitado — bypass confirmado na auditoria', () => {
    expect(caminhoInternoSeguro(`/${LF}/evil.com`)).toBeUndefined()
  })

  it('CR (U+000D) em qualquer posição é rejeitado — bypass confirmado na auditoria', () => {
    expect(caminhoInternoSeguro(`/${CR}/evil.com`)).toBeUndefined()
  })

  it('NUL (U+0000) é rejeitado', () => {
    expect(caminhoInternoSeguro(`/${NUL}/evil.com`)).toBeUndefined()
  })

  it('DEL (U+007F) é rejeitado', () => {
    expect(caminhoInternoSeguro(`/${DEL}/evil.com`)).toBeUndefined()
  })

  it('caminho legítimo nunca contém controles — não há falso positivo esperado', () => {
    expect(caminhoInternoSeguro('/interno/provedores/42')).toBe('/interno/provedores/42')
  })
})
