import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeContrast,
  classifyContrast,
  contrastMessage,
  contrastRatio,
  formatContrastRatio,
  parseColor,
  relativeLuminance,
} from '../src/index.js';

test('calcula luminância relativa para preto e branco', () => {
  assert.equal(relativeLuminance('#000000'), 0);
  assert.ok(Math.abs(relativeLuminance('#ffffff') - 1) < 1e-12);
});

test('calcula a razão máxima de contraste como 21:1', () => {
  assert.ok(Math.abs(contrastRatio('#000', '#fff') - 21) < 1e-12);
});

test('implementa a conversão sRGB no ponto de referência WCAG', () => {
  const ratio = contrastRatio('#767676', '#ffffff');
  assert.ok(ratio >= 4.5 && ratio < 4.6, `razão inesperada: ${ratio}`);
  assert.ok(contrastRatio('#777777', '#ffffff') < 4.5);
});

test('classifica texto normal e grande nos limiares corretos', () => {
  assert.equal(classifyContrast(7, 'normal').level, 'AAA');
  assert.equal(classifyContrast(4.5, 'normal').level, 'AA');
  assert.equal(classifyContrast(4.49, 'normal').level, 'Falha');
  assert.equal(classifyContrast(4.5, 'large').level, 'AAA');
  assert.equal(classifyContrast(3, 'large').level, 'AA');
  assert.equal(classifyContrast(2.99, 'large').level, 'Falha');
});

test('aceita hexadecimal curto, CSS rgb/rgba e objeto RGB', () => {
  assert.deepEqual(parseColor('#0f08'), { red: 0, green: 255, blue: 0, alpha: 0x88 / 255 });
  assert.deepEqual(parseColor('rgb(100% 0% 50% / 25%)'), {
    red: 255,
    green: 0,
    blue: 127.5,
    alpha: 0.25,
  });
  assert.deepEqual(parseColor({ red: 10, green: 20, blue: 30 }), {
    red: 10,
    green: 20,
    blue: 30,
    alpha: 1,
  });
});

test('compõe transparência sobre branco e depois sobre o fundo', () => {
  const semiBlackOverWhite = contrastRatio('rgba(0, 0, 0, 0.5)', '#fff');
  assert.ok(semiBlackOverWhite > 3.9 && semiBlackOverWhite < 4.1);
  const semiWhiteOverBlack = contrastRatio('rgba(255,255,255,0.5)', '#000');
  assert.ok(semiWhiteOverBlack > 5.2 && semiWhiteOverBlack < 5.4);
});

test('gera análise completa e mensagem útil em português', () => {
  const analysis = analyzeContrast('#000', '#fff');
  assert.equal(analysis.ratioFormatted, '21,00:1');
  assert.equal(analysis.normalText.level, 'AAA');
  assert.equal(analysis.largeText.level, 'AAA');
  assert.match(analysis.message, /Texto normal/);
  assert.match(analysis.message, /Texto grande/);
  assert.match(analysis.message, /AAA/);
});

test('gera orientação para uma combinação que falha', () => {
  const message = contrastMessage(2);
  assert.match(message, /não passa AA/);
  assert.match(message, /Aumente a diferença/);
});

test('valida entradas inválidas', () => {
  assert.throws(() => parseColor('#12'), /Hexadecimal/);
  assert.throws(() => parseColor('rgb(300, 0, 0)'), /entre 0 e 255/);
  assert.throws(() => parseColor({ red: 0, green: 0, blue: 0, alpha: 2 }), /alpha/);
  assert.throws(() => classifyContrast(0.5), /maior ou igual a 1/);
  assert.throws(() => formatContrastRatio(4.5, 7), /entre 0 e 6/);
});
