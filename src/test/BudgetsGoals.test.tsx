import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BudgetsPage from '../pages/BudgetsPage';
import GoalsPage from '../pages/GoalsPage';
import api from '../services/api';

vi.mock('../services/api', async (orig) => {
  const actual = await orig<typeof import('../services/api')>();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const overview = {
  month: '2026-11', totalAllocated: 8000, totalSpent: 5500, totalRemaining: 2500, utilizationPercent: 68.8, alerts: ['Shopping: over budget by 500'],
  items: [
    { id: 1, categoryId: 7, categoryName: 'Food', amount: 5000, spent: 3500, remaining: 1500, utilizationPercent: 70, status: 'ON_TRACK' },
    { id: 2, categoryId: 8, categoryName: 'Shopping', amount: 3000, spent: 3500, remaining: -500, utilizationPercent: 116.7, status: 'EXCEEDED' },
  ],
};

describe('BudgetsPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/budgets') return { data: overview };
      if (url === '/budgets/history') return { data: [] };
      return { data: [{ id: 9, name: 'Rent', type: 'EXPENSE' }] };
    });
  });

  it('shows budgets with their status, remaining amount and alerts', async () => {
    render(<MemoryRouter><BudgetsPage /></MemoryRouter>);
    expect(await screen.findByText('Food')).toBeInTheDocument();
    expect(screen.getByText('On track')).toBeInTheDocument();
    expect(screen.getByText('Exceeded')).toBeInTheDocument();
    expect(screen.getByText('Shopping: over budget by 500')).toBeInTheDocument();
    expect(screen.getByText(/over$/)).toBeInTheDocument();
  });
});

describe('GoalsPage', () => {
  it('shows progress, completed and overdue states', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        { id: 1, name: 'Laptop', targetAmount: 1000, savedAmount: 400, remainingAmount: 600, progressPercent: 40, targetDate: '2020-01-01', status: 'ACTIVE', overdue: true, createdAt: '', completedAt: null },
        { id: 2, name: 'Trip', targetAmount: 500, savedAmount: 500, remainingAmount: 0, progressPercent: 100, targetDate: null, status: 'COMPLETED', overdue: false, createdAt: '', completedAt: 'x' },
      ],
    });
    render(<MemoryRouter><GoalsPage /></MemoryRouter>);
    expect(await screen.findByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add money' })).toHaveLength(1);
  });

  it('shows an empty state with guidance', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    render(<MemoryRouter><GoalsPage /></MemoryRouter>);
    expect(await screen.findByText(/No goals yet/)).toBeInTheDocument();
  });
});
