/**
 * Utilitários sem dependências de runtime para contraste de cores conforme WCAG 2.2.
 *
 * Cores podem ser informadas como hexadecimal (#RGB, #RGBA, #RRGGBB ou
 * #RRGGBBAA), rgb()/rgba() ou objeto RGB. Cores com transparência são
 * compostas sobre branco; quando o primeiro argumento é o texto, ele é
 * composto sobre o fundo antes do cálculo.
 */

export type TextSize = 'normal' | 'large';

export interface RgbColor {
  red: number;
  green: number;
  blue: number;
  alpha?: number;
}

export type ColorInput = string | RgbColor;

export interface ParsedColor extends RgbColor {
  alpha: number;
}

export interface ContrastClassification {
  size: TextSize;
  passesAA: boolean;
  passesAAA: boolean;
  level: 'AAA' | 'AA' | 'Falha';
  minimumRatioAA: number;
  minimumRatioAAA: number;
}

export interface ContrastAnalysis {
  foreground: ParsedColor;
  background: ParsedColor;
  foregroundLuminance: number;
  backgroundLuminance: number;
  ratio: number;
  ratioFormatted: string;
  normalText: ContrastClassification;
  largeText: ContrastClassification;
  message: string;
}

const WHITE: ParsedColor = { red: 255, green: 255, blue: 255, alpha: 1 };
const EPSILON = 0.0000001;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertChannel(value: unknown, name: string): number {
  if (!isFiniteNumber(value) || value < 0 || value > 255) {
    throw new TypeError(`${name} deve ser um número entre 0 e 255.`);
  }
  return value;
}

function assertAlpha(value: unknown): number {
  if (!isFiniteNumber(value) || value < 0 || value > 1) {
    throw new TypeError('alpha deve ser um número entre 0 e 1.');
  }
  return value;
}

function parseCssChannel(value: string, name: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const percentage = Number(trimmed.slice(0, -1));
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new TypeError(`${name} deve ser um canal CSS válido.`);
    }
    return (percentage / 100) * 255;
  }

  const channel = Number(trimmed);
  return assertChannel(channel, name);
}

function parseCssAlpha(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const percentage = Number(trimmed.slice(0, -1));
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new TypeError('alpha deve ser um número entre 0 e 1 ou uma porcentagem.');
    }
    return percentage / 100;
  }
  return assertAlpha(Number(trimmed));
}

function parseHex(value: string): ParsedColor {
  const hex = value.slice(1);
  if (![3, 4, 6, 8].includes(hex.length) || !/^[\da-f]+$/i.test(hex)) {
    throw new TypeError('Hexadecimal deve usar #RGB, #RGBA, #RRGGBB ou #RRGGBBAA.');
  }

  const expanded = hex.length <= 4
    ? [...hex].map((digit) => `${digit}${digit}`).join('')
    : hex;
  const hasAlpha = expanded.length === 8;
  return {
    red: Number.parseInt(expanded.slice(0, 2), 16),
    green: Number.parseInt(expanded.slice(2, 4), 16),
    blue: Number.parseInt(expanded.slice(4, 6), 16),
    alpha: hasAlpha ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  };
}

function parseRgbFunction(value: string): ParsedColor {
  const match = value.match(/^rgba?\((.*)\)$/i);
  if (!match) {
    throw new TypeError('Cor inválida. Use hexadecimal, rgb() ou rgba().');
  }

  // Aceita tanto a sintaxe legada separada por vírgulas quanto a sintaxe
  // moderna com espaços e barra: rgb(10 20 30 / 50%).
  const body = match[1]!.trim();
  const slashParts = body.split(/\s*\/\s*/);
  let parts: string[];
  if (slashParts.length === 2) {
    const channels = slashParts[0]!.includes(',')
      ? slashParts[0]!.split(',').map((part) => part.trim()).filter(Boolean)
      : slashParts[0]!.split(/\s+/).filter(Boolean);
    parts = [...channels, slashParts[1]!.trim()];
  } else if (slashParts.length === 1) {
    parts = body.includes(',')
      ? body.split(',').map((part) => part.trim()).filter(Boolean)
      : body.split(/\s+/).filter(Boolean);
  } else {
    parts = [];
  }

  if (parts.length !== 3 && parts.length !== 4) {
    throw new TypeError('rgb()/rgba() deve conter 3 canais e, opcionalmente, alpha.');
  }

  return {
    red: parseCssChannel(parts[0]!, 'red'),
    green: parseCssChannel(parts[1]!, 'green'),
    blue: parseCssChannel(parts[2]!, 'blue'),
    alpha: parts.length === 4 ? parseCssAlpha(parts[3]!) : 1,
  };
}

/** Converte uma cor aceita pela biblioteca para seus canais RGB normalizados. */
export function parseColor(input: ColorInput): ParsedColor {
  if (typeof input === 'string') {
    const value = input.trim();
    if (value.toLowerCase() === 'transparent') {
      return { red: 0, green: 0, blue: 0, alpha: 0 };
    }
    if (value.startsWith('#')) {
      return parseHex(value);
    }
    if (/^rgba?\(/i.test(value)) {
      return parseRgbFunction(value);
    }
    throw new TypeError('Cor inválida. Use hexadecimal, rgb(), rgba() ou transparent.');
  }

  if (typeof input !== 'object' || input === null) {
    throw new TypeError('A cor deve ser uma string ou um objeto RGB.');
  }

  return {
    red: assertChannel(input.red, 'red'),
    green: assertChannel(input.green, 'green'),
    blue: assertChannel(input.blue, 'blue'),
    alpha: input.alpha === undefined ? 1 : assertAlpha(input.alpha),
  };
}

function compositeOver(top: ParsedColor, bottom: ParsedColor): ParsedColor {
  const alpha = top.alpha + bottom.alpha * (1 - top.alpha);
  if (alpha <= EPSILON) {
    return { red: 0, green: 0, blue: 0, alpha: 0 };
  }

  return {
    red: (top.red * top.alpha + bottom.red * bottom.alpha * (1 - top.alpha)) / alpha,
    green: (top.green * top.alpha + bottom.green * bottom.alpha * (1 - top.alpha)) / alpha,
    blue: (top.blue * top.alpha + bottom.blue * bottom.alpha * (1 - top.alpha)) / alpha,
    alpha,
  };
}

function opaqueColor(color: ParsedColor): ParsedColor {
  return compositeOver(color, WHITE);
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminanceFromOpaqueColor(color: ParsedColor): number {
  return (
    0.2126 * channelToLinear(color.red) +
    0.7152 * channelToLinear(color.green) +
    0.0722 * channelToLinear(color.blue)
  );
}

/** Calcula a luminância relativa WCAG (entre 0 e 1). Transparência é composta sobre branco. */
export function relativeLuminance(input: ColorInput): number {
  return luminanceFromOpaqueColor(opaqueColor(parseColor(input)));
}

function effectivePair(foreground: ParsedColor, background: ParsedColor): [ParsedColor, ParsedColor] {
  const effectiveBackground = opaqueColor(background);
  const effectiveForeground = compositeOver(foreground, effectiveBackground);
  return [effectiveForeground, effectiveBackground];
}

/** Calcula a razão de contraste WCAG 2.2, retornando um valor entre 1 e 21. */
export function contrastRatio(foregroundInput: ColorInput, backgroundInput: ColorInput): number {
  const foreground = parseColor(foregroundInput);
  const background = parseColor(backgroundInput);
  const [effectiveForeground, effectiveBackground] = effectivePair(foreground, background);
  const foregroundLuminance = luminanceFromOpaqueColor(effectiveForeground);
  const backgroundLuminance = luminanceFromOpaqueColor(effectiveBackground);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Formata uma razão de contraste para exibição, por exemplo, 4,50:1. */
export function formatContrastRatio(ratio: number, decimals = 2): string {
  if (!isFiniteNumber(ratio) || ratio < 1) {
    throw new TypeError('A razão de contraste deve ser um número maior ou igual a 1.');
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    throw new RangeError('decimals deve ser um inteiro entre 0 e 6.');
  }
  return `${ratio.toFixed(decimals).replace('.', ',')}:1`;
}

/** Classifica uma razão para texto normal ou grande conforme os limiares WCAG 2.2. */
export function classifyContrast(ratio: number, size: TextSize = 'normal'): ContrastClassification {
  if (!isFiniteNumber(ratio) || ratio < 1) {
    throw new TypeError('A razão de contraste deve ser um número maior ou igual a 1.');
  }
  if (size !== 'normal' && size !== 'large') {
    throw new TypeError("size deve ser 'normal' ou 'large'.");
  }

  const minimumRatioAA = size === 'normal' ? 4.5 : 3;
  const minimumRatioAAA = size === 'normal' ? 7 : 4.5;
  const passesAA = ratio + EPSILON >= minimumRatioAA;
  const passesAAA = ratio + EPSILON >= minimumRatioAAA;
  return {
    size,
    passesAA,
    passesAAA,
    level: passesAAA ? 'AAA' : passesAA ? 'AA' : 'Falha',
    minimumRatioAA,
    minimumRatioAAA,
  };
}

function classificationMessage(label: string, classification: ContrastClassification): string {
  if (classification.level === 'AAA') {
    return `${label}: passa AAA (AA e AAA).`;
  }
  if (classification.level === 'AA') {
    return `${label}: passa AA, mas não AAA.`;
  }
  return `${label}: não passa AA (mínimo ${classification.minimumRatioAA.toString().replace('.', ',')}:1).`;
}

/** Gera uma mensagem em português com o resultado e a orientação de melhoria. */
export function contrastMessage(ratio: number): string {
  const normalText = classifyContrast(ratio, 'normal');
  const largeText = classifyContrast(ratio, 'large');
  const details = [
    classificationMessage('Texto normal', normalText),
    classificationMessage('Texto grande', largeText),
  ];

  if (!normalText.passesAA) {
    details.push('Aumente a diferença entre as cores (escureça o texto ou clareie o fundo) e teste novamente.');
  } else if (!normalText.passesAAA) {
    details.push('Para atingir AAA em texto normal, use uma razão de pelo menos 7:1.');
  } else {
    details.push('A combinação atende ao nível mais exigente para texto normal.');
  }

  return `Contraste ${formatContrastRatio(ratio)}. ${details.join(' ')}`;
}

/** Calcula a razão, as classificações e uma mensagem pronta para a interface. */
export function analyzeContrast(
  foregroundInput: ColorInput,
  backgroundInput: ColorInput,
): ContrastAnalysis {
  const foreground = parseColor(foregroundInput);
  const background = parseColor(backgroundInput);
  const [effectiveForeground, effectiveBackground] = effectivePair(foreground, background);
  const foregroundLuminance = luminanceFromOpaqueColor(effectiveForeground);
  const backgroundLuminance = luminanceFromOpaqueColor(effectiveBackground);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    foreground,
    background,
    foregroundLuminance,
    backgroundLuminance,
    ratio,
    ratioFormatted: formatContrastRatio(ratio),
    normalText: classifyContrast(ratio, 'normal'),
    largeText: classifyContrast(ratio, 'large'),
    message: contrastMessage(ratio),
  };
}
