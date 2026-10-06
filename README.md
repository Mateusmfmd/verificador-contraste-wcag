# verificador-contraste-wcag

Biblioteca TypeScript pequena e **sem dependências de runtime** para calcular contraste de cores segundo os critérios de contraste da **WCAG 2.2**. Ela calcula luminância relativa, razão de contraste, classifica AA/AAA para texto normal e grande e produz mensagens orientativas em português.

> O pacote não publica nem envia dados para a rede. As dependências de desenvolvimento servem apenas para compilar TypeScript e tipar os testes.

## Requisitos

- Node.js 20 ou mais recente para os scripts de desenvolvimento.
- A biblioteca emitida é JavaScript ESM compatível com runtimes modernos.

## Instalação e uso

```bash
npm install verificador-contraste-wcag
```

Exemplo em TypeScript/JavaScript ESM:

```ts
import {
  analyzeContrast,
  contrastRatio,
  classifyContrast,
} from 'verificador-contraste-wcag';

const ratio = contrastRatio('#1f2937', '#ffffff');
console.log(ratio); // aproximadamente 14,68

const normal = classifyContrast(ratio, 'normal');
console.log(normal.level); // AAA

const result = analyzeContrast('rgb(31 41 55)', '#fff');
console.log(result.ratioFormatted); // por exemplo, "14,68:1"
console.log(result.message);
```

## API

### `parseColor(input)`

Normaliza uma cor para `{ red, green, blue, alpha }`, com canais RGB de 0 a 255 e `alpha` de 0 a 1. Aceita:

- `#RGB`, `#RGBA`, `#RRGGBB` e `#RRGGBBAA`;
- `rgb(10, 20, 30)`, `rgba(10, 20, 30, .8)` e a sintaxe moderna `rgb(10 20 30 / 80%)`;
- `transparent`;
- objeto `{ red, green, blue, alpha? }`.

Entradas inválidas lançam `TypeError` com uma mensagem em português. Nomes de cores CSS, como `navy`, não são aceitos deliberadamente: use o valor hexadecimal ou `rgb()` equivalente para manter a API pequena e previsível.

### `relativeLuminance(color)`

Calcula a luminância relativa entre 0 e 1 usando a conversão sRGB e os pesos definidos pela WCAG 2.2.

### `contrastRatio(foreground, background)`

Retorna a razão de contraste entre 1 e 21, usando a fórmula `(Lmais clara + 0,05) / (Lmais escura + 0,05)`. A ordem dos argumentos é semântica: o primeiro é o texto/foreground e o segundo, o fundo/background.

### `classifyContrast(ratio, size?)`

Classifica uma razão já calculada. `size` é `'normal'` (padrão) ou `'large'` (texto grande). O retorno contém `passesAA`, `passesAAA`, `level` (`'AAA'`, `'AA'` ou `'Falha'`) e os limiares aplicados.

| Tipo de texto | AA | AAA |
| --- | ---: | ---: |
| Normal | 4,5:1 | 7:1 |
| Grande | 3:1 | 4,5:1 |

Para este projeto, texto grande significa pelo menos 18 pt (aproximadamente 24 px) ou 14 pt em negrito (aproximadamente 18,66 px), conforme a definição da WCAG.

### `contrastMessage(ratio)`

Gera uma mensagem em português com a razão, o resultado para texto normal e grande e uma orientação de melhoria quando necessário.

### `analyzeContrast(foreground, background)`

Atalho completo: retorna as cores normalizadas, luminâncias efetivas, `ratio`, `ratioFormatted`, `normalText`, `largeText` e `message`.

### `formatContrastRatio(ratio, decimals?)`

Formata a razão para exibição, usando vírgula decimal e o sufixo `:1`; por exemplo, `4.5` vira `"4,50:1"`.

## Transparência

A razão de contraste precisa comparar cores efetivas. Para tornar o resultado determinístico, esta biblioteca compõe um background transparente sobre branco; o foreground transparente é então composto sobre o background efetivo. Para interfaces sobre outro backdrop, resolva a transparência antes de chamar a biblioteca ou forneça cores opacas equivalentes.

## Desenvolvimento

```bash
npm install
npm test          # compila e executa node:test
npm run build     # gera dist/*.js e declarações TypeScript
npm run check     # build, testes e verificação do conteúdo do pacote
```

Os testes usam exclusivamente o **test runner built-in do Node** (`node:test` e `node:assert/strict`), sem Jest, Vitest ou outra dependência de runtime.

### Demo acessível

Depois de compilar, sirva a raiz localmente para que o módulo ESM da demo seja carregado:

```bash
npm run build
python3 -m http.server 8080
```

Abra <http://localhost:8080/demo/>. A página possui labels associados, foco visível, contraste de interface, tabela semântica e região `aria-live` para anunciar a razão e as mensagens. O projeto inclui somente a demo estática; não é necessário executar um servidor para usar a biblioteca.

## Escopo e conformidade

O cálculo implementa a fórmula de luminância/contraste e os limiares de texto da WCAG 2.2. Ele não substitui uma auditoria completa: tamanho real, peso da fonte, texto incidental, componentes gráficos, foco, estados interativos e outros critérios também devem ser avaliados no contexto da interface.

## Licença

MIT. Consulte [`LICENSE`](LICENSE).
