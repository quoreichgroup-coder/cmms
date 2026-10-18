export const percentageOrNull = (
  numerator: number,
  denominator: number
): number | null => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return (numerator / denominator) * 100;
};

export const agingBand = (averageAgeDays: number): 'ok' | 'attention' | 'critical' => {
  if (averageAgeDays > 30) return 'critical';
  if (averageAgeDays > 7) return 'attention';
  return 'ok';
};

export const createDashboardCurrencyFormatter = (
  locale: string,
  configuredCurrency?: string
): Pick<Intl.NumberFormat, 'format'> => {
  const currency = configuredCurrency?.trim() || 'EUR';
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    });
  } catch (_error) {
    // Older QPM company settings may store a display symbol (for example "$")
    // where Intl expects a three-letter ISO 4217 code.
    return {
      format: (value: number) =>
        /^[A-Z]{3}$/i.test(currency)
          ? `${number.format(value)} ${currency}`
          : `${currency} ${number.format(value)}`
    };
  }
};
