export const percentageOrNull = (
  numerator: number,
  denominator: number
): number | null => {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null;
  }
  return (numerator / denominator) * 100;
};

export const agingBand = (
  averageAgeDays: number
): 'ok' | 'attention' | 'critical' => {
  if (averageAgeDays > 30) return 'critical';
  if (averageAgeDays > 7) return 'attention';
  return 'ok';
};

/**
 * Formats an API calendar date without letting the browser timezone shift it.
 * The backend serializes LocalDate values as Date instants; parsing an ISO
 * midnight timestamp directly can show the previous day in western timezones.
 */
export const formatAnalyticsDateLabel = (
  dateValue: string,
  locale: string
): string => {
  const datePart = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue);
  let date: Date;

  if (datePart) {
    const [, year, month, day] = datePart;
    date = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      date.getFullYear() !== Number(year) ||
      date.getMonth() !== Number(month) - 1 ||
      date.getDate() !== Number(day)
    ) {
      date = new Date(dateValue);
    }
  } else {
    date = new Date(dateValue);
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const createDashboardCurrencyFormatter = (
  locale: string,
  configuredCurrency?: string
): Pick<Intl.NumberFormat, 'format'> => {
  const currency = configuredCurrency?.trim();
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  if (!currency) return number;

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
