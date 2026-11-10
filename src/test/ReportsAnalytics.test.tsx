import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsPage from '../pages/ReportsPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import api from '../services/api';

vi.mock('../services/api', async (orig) => {
  const actual = await orig<typeof import('../services/api')>();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const monthly = {
  title: 'Monthly report: 2026-11', subtitle: 'From 2026-11-01 to 2026-11-30', columns: ['Type', 'Category', 'Amount', 'Share of type'],
  rows: [['Income', 'Salary', 10000, '100.0%'], ['Expense', 'Rent', 8000, '80.0%']],
  summary: [{ label: 'Total income', value: 10000 }, { label: 'Savings rate', value: '30.0%' }],
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: unknown }) => {
      const params = config?.params as Record<string, string> | undefined;
      if (url === '/accounts') return { data: [{ id: 1, name: 'Main', active: true }] };
      if (url === '/reports/monthly') return { data: params?.format ? new Blob(['x']) : monthly };
      return { data: monthly };
    });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('generates a preview with summary and table', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Generate report' }));
    expect(await screen.findByText('Monthly report: 2026-11')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('10,000.00', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/reports/monthly', { params: expect.objectContaining({ month: expect.any(String) }) });
  });

  it('downloads the chosen format with the same filters', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Generate report' }));
    await screen.findByText('Monthly report: 2026-11');
    await userEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/reports/monthly', expect.objectContaining({ responseType: 'blob', params: expect.objectContaining({ format: 'pdf' }) })));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  });

  it('requires an account for statements', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('combobox', { name: 'Report' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Account statement' }));
    expect(screen.getByRole('button', { name: 'Generate report' })).toBeDisabled();
    expect(screen.getByText('Choose an account first.')).toBeInTheDocument();
  });

  it('shows the server message when a report fails', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/accounts') return { data: [] };
      throw { isAxiosError: true, response: { data: { message: 'Date range is limited to 5 years' } } };
    });
    render(<MemoryRouter><ReportsPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Generate report' }));
    expect(await screen.findByText(/Date range is limited|Unexpected error|Request failed/)).toBeInTheDocument();
  });
});

describe('AnalyticsPage', () => {
  it('renders every chart section', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/analytics/overview') return { data: { from: '2026-06-01', to: '2026-11-30', monthly: [{ month: '2026-11', income: 10, expense: 5, savings: 5 }], expenseByCategory: [{ category: 'Food', amount: 5 }], accountBalances: [{ name: 'Main', type: 'SAVINGS', balance: 100, creditCard: false }, { name: 'Visa', type: 'CREDIT_CARD', balance: 40, creditCard: true }] } };
      if (url === '/budgets') return { data: { items: [] } };
      return { data: { year: 2026, previousYear: 2025, months: [] } };
    });
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    for (const title of ['Income vs expenses', 'Monthly expense trend', 'Monthly savings trend', 'Category-wise expenses', 'Account balance distribution', 'Budget utilization (this month)']) {
      expect(await screen.findByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText(/Not in the chart \(money owed\)/)).toBeInTheDocument();
    expect(screen.getByText(/Yearly expense comparison/)).toBeInTheDocument();
  });

  it('shows the server error', async () => {
    vi.mocked(api.get).mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Boom' } } });
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
