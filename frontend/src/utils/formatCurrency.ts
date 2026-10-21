/** Format the UEMOA CFA franc while retaining its ISO code in configuration. */
export const formatXofAmount = (
  amount: number | string,
  locale: string
): string => {
  const rawAmount = String(amount ?? '');
  const numericAmount = Number(rawAmount);
  if (!rawAmount.trim()) return '';
  if (!Number.isFinite(numericAmount)) {
    return `${rawAmount} XOF`;
  }

  try {
    return `${new Intl.NumberFormat(locale || 'fr-FR', {
      maximumFractionDigits: 0
    }).format(numericAmount)} FCFA`;
  } catch (_error) {
    return `${new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0
    }).format(numericAmount)} FCFA`;
  }
};

/** Format a company's configured ISO currency, tolerating legacy display symbols. */
export const formatCompanyCurrency = (
  amount: number | string,
  currencyCode: string | null | undefined,
  locale: string
): string => {
  const rawAmount = String(amount ?? '');
  if (!rawAmount.trim()) return '';
  const code = currencyCode?.trim();
  if (!code) return formatNumber(rawAmount, locale);
  if (code.toUpperCase() === 'XOF') return formatXofAmount(rawAmount, locale);

  const numericAmount = Number(rawAmount);
  if (!Number.isFinite(numericAmount)) return `${rawAmount} ${code}`;
  try {
    return new Intl.NumberFormat(locale || 'fr-FR', {
      style: 'currency',
      currency: code
    }).format(numericAmount);
  } catch (_error) {
    // Historical settings may contain symbols ("$", "€") rather than ISO codes.
    return /^[A-Z]{3}$/i.test(code)
      ? `${formatNumber(rawAmount, locale)} ${code.toUpperCase()}`
      : `${code} ${formatNumber(rawAmount, locale)}`;
  }
};

const formatNumber = (amount: string, locale: string): string => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return amount;
  try {
    return new Intl.NumberFormat(locale || 'fr-FR').format(numericAmount);
  } catch (_error) {
    return new Intl.NumberFormat('fr-FR').format(numericAmount);
  }
};
