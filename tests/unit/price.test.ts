import { describe, expect, test } from 'vitest';
import { formatCop, formatPricePlusTax, taxSuffix } from '../../src/lib/price';

/** Intl puts a no-break space between the symbol and the amount; compare with plain spaces. */
const plain = (text: string): string => text.replace(/ /g, ' ');

describe('prices in Colombian pesos (plan D7)', () => {
  test('Spanish shows the peso sign and a dot for thousands', () => {
    expect(plain(formatCop(1000, 'es-CO'))).toBe('$ 1.000');
    expect(plain(formatCop(100000, 'es-CO'))).toBe('$ 100.000');
  });

  test('English shows the currency code and a comma for thousands', () => {
    expect(plain(formatCop(1200, 'en'))).toBe('COP 1,200');
  });

  test('no decimals', () => {
    expect(plain(formatCop(400, 'es-CO'))).toBe('$ 400');
    expect(plain(formatCop(400, 'en'))).toBe('COP 400');
  });

  test('the tax note follows the locale', () => {
    expect(taxSuffix('es-CO')).toBe('+ IVA');
    expect(taxSuffix('en')).toBe('+ VAT (IVA)');
    expect(taxSuffix('EN-us')).toBe('+ VAT (IVA)');
    expect(plain(formatPricePlusTax(1000, 'es-CO'))).toBe('$ 1.000 + IVA');
    expect(plain(formatPricePlusTax(1000, 'en'))).toBe('COP 1,000 + VAT (IVA)');
  });

  test('refuses a value that is not a price', () => {
    expect(() => formatCop(-1, 'es-CO')).toThrow(RangeError);
    expect(() => formatCop(Number.NaN, 'en')).toThrow(RangeError);
  });
});
