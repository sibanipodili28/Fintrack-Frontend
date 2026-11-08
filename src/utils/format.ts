export const formatMoney = (value: number, currency = 'INR'): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

export const accountTypeLabel = (t: string): string =>
  ({ SAVINGS: 'Savings', CURRENT: 'Current', CASH_WALLET: 'Cash wallet', DIGITAL_WALLET: 'Digital wallet', CREDIT_CARD: 'Credit card' } as Record<string, string>)[t] ?? t;

export const today = (): string => new Date().toISOString().slice(0, 10);
