const CODIGO_MAX_CONTROLE_C0 = 0x1f
const CODIGO_DEL = 0x7f

/**
 * Detecta caracteres de controle C0 (0x00-0x1F) e DEL (0x7F) na string.
 *
 * Verificação por código de caractere (não regex) de propósito: evita
 * embutir bytes de controle "crus" no código-fonte (arriscado para
 * editores/diffs/ferramentas de terceiros) e o `eslint-disable` que uma
 * regex equivalente exigiria (`no-control-regex`).
 */
function contemCaractereDeControle(valor: string): boolean {
  for (let indice = 0; indice < valor.length; indice += 1) {
    const codigo = valor.charCodeAt(indice)
    if (codigo <= CODIGO_MAX_CONTROLE_C0 || codigo === CODIGO_DEL) return true
  }
  return false
}

/**
 * Valida que uma string vinda da API é um caminho interno seguro antes de
 * entrar em `<Link to>`, `<a href>` ou `navigate({ href })` (BAIXO-02 da
 * auditoria de segurança — A01 Open Redirect / A03 input não confiável em
 * sink de navegação).
 *
 * Defesa em profundidade: o backend (BACK-2/BACK-3) já garante que todo
 * `url` público retornado pela API é um caminho relativo montado a partir do
 * value object `Slug` (`[a-z0-9-]+`, sem `/`, `\` ou `:`) — não há vetor
 * ativo hoje. Mas quem fecha o vetor de fato **é este filtro**, não a
 * garantia do backend: se um endpoint novo, uma migração de dados ou um bug
 * algum dia devolver outra coisa, é este código que segura a porta — por
 * isso ele precisa ser correto de fato, não decorativo.
 *
 * Único saneador de caminho interno da base — também usado por
 * `routes/interno/entrar.tsx` para montar `redirectUri` do login (BAIXO-01).
 * Nesse consumidor, quem fecha o vetor de fato é a concatenação com
 * `window.location.origin` (a origem é sempre literal, o retorno daqui só
 * contribui com o caminho); em sinks sem essa segunda camada (`<a href>`
 * direto, sem `<Link>` do router nem concatenação com origem), este filtro É
 * a única defesa — por isso precisa ser correto sozinho, sem depender de
 * quem o chama. Ver AP-SECURITY-011/010: não basta copiar a função, é
 * preciso saber qual camada sustentava a garantia no contexto de origem
 * antes de reusá-la em um sink mais exposto.
 *
 * Exigir `startsWith('/')` já descarta URL absoluta com esquema
 * (`https://evil.com`, `javascript:alert(1)`, `data:text/html,…`) e qualquer
 * string sem barra inicial; os dois `startsWith` seguintes fecham as
 * variações que alguns navegadores normalizam para protocol-relative
 * (`//host`, `/\host`).
 *
 * A rejeição de controles C0 e DEL roda ANTES desses `startsWith` de
 * propósito: o parser de URL do navegador (WHATWG) remove TAB/LF/CR de
 * qualquer posição da string antes de interpretá-la, então um caminho como
 * "/<TAB>/evil.com" só colapsa para "//evil.com" (protocol-relative) DEPOIS
 * que os `startsWith` já rodaram sobre a forma pré-normalização — validar a
 * string como ela chegou não protege um sink que a resolve como o navegador
 * a normaliza (BAIXO-03, AP-SECURITY-011). Caminho legítimo (montado a
 * partir de `Slug`) nunca contém esses caracteres, então rejeitar a classe
 * inteira não custa nenhum caso real.
 */
export function caminhoInternoSeguro(caminho: string | null | undefined): string | undefined {
  if (!caminho || !caminho.startsWith('/')) return undefined
  if (contemCaractereDeControle(caminho)) return undefined
  if (caminho.startsWith('//') || caminho.startsWith('/\\')) return undefined
  return caminho
}
