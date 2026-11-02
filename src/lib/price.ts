/**
 * Prices in Colombian pesos, per locale (plan D7). Spanish readers see the peso sign and IVA ("$ 1.000 + IVA");
 * English readers see the currency code and VAT, with the Colombian name in brackets ("COP 1,000 + VAT (IVA)").
 * Amounts have no decimals.
 */

/** The BCP 47 tags the site renders: `es-CO` for the root locale, `en` for English. */
export type PriceLocale = string;

const isEnglish = (locale: PriceLocale): boolean => locale.toLowerCase().startsWith('en');

/** A whole amount of Colombian pesos, formatted for the locale. */
export function formatCop(amount: number, locale: PriceLocale): string {
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError(`not a price: ${amount}`);
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

/** The tax note that follows a price: "+ IVA" in Spanish, "+ VAT (IVA)" in English. */
export function taxSuffix(locale: PriceLocale): string {
  return isEnglish(locale) ? '+ VAT (IVA)' : '+ IVA';
}

/** A price before tax, with its tax note: "$ 1.000 + IVA" or "COP 1,000 + VAT (IVA)". */
export function formatPricePlusTax(amount: number, locale: PriceLocale): string {
  return `${formatCop(amount, locale)} ${taxSuffix(locale)}`;
}
