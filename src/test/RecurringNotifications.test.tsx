import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecurringPage from '../pages/RecurringPage';
import NotificationsPage from '../pages/NotificationsPage';
import api from '../services/api';

vi.mock('../services/api', async (orig) => {
  const actual = await orig<typeof import('../services/api')>();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const rule = (id: number, status: string, name: string) => ({
  id, accountId: 1, accountName: 'Main', categoryId: 2, categoryName: 'Rent', type: 'EXPENSE', amount: 8000, description: name,
  frequency: 'MONTHLY', startDate: '2026-11-01', endDate: null, nextExecutionDate: '2026-12-01', status, createdAt: '',
});

describe('RecurringPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/recurring') return { data: [rule(1, 'ACTIVE', 'Rent'), rule(2, 'PAUSED', 'Netflix'), rule(3, 'CANCELLED', 'Old gym')] };
      return { data: [] };
    });
  });

  it('offers actions that match each rule status', async () => {
    render(<MemoryRouter><RecurringPage /></MemoryRouter>);
    expect(await screen.findByText('Rent')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Pause' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Resume' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'History' })).toHaveLength(3);
  });

  it('runs due rules and reports the result', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { executed: 2, failed: 1 } });
    render(<MemoryRouter><RecurringPage /></MemoryRouter>);
    await screen.findByText('Rent');
    await userEvent.click(screen.getByRole('button', { name: 'Run due now' }));
    expect(await screen.findByText('2 posted, 1 failed.')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/recurring/run-due');
  });
});

describe('NotificationsPage', () => {
  const page = (content: unknown[]) => ({ data: { content, page: 0, size: 10, totalElements: content.length, totalPages: 1 } });

  it('shows unread items and marks one as read when clicked', async () => {
    vi.mocked(api.get).mockResolvedValue(page([
      { id: 1, type: 'BUDGET_EXCEEDED', title: 'Food budget exceeded', message: 'You are 160 over.', read: false, createdAt: '2026-11-09T10:00:00' },
      { id: 2, type: 'GOAL_COMPLETED', title: 'Goal completed', message: 'Done.', read: true, createdAt: '2026-11-08T10:00:00' },
    ]));
    vi.mocked(api.post).mockResolvedValue({ data: null });
    render(<MemoryRouter><NotificationsPage /></MemoryRouter>);
    expect(await screen.findByText('Food budget exceeded')).toBeInTheDocument();
    expect(screen.getAllByText('New')).toHaveLength(1);
    await userEvent.click(screen.getByText('Food budget exceeded'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/1/read'));
  });

  it('shows a friendly empty state', async () => {
    vi.mocked(api.get).mockResolvedValue(page([]));
    render(<MemoryRouter><NotificationsPage /></MemoryRouter>);
    expect(await screen.findByText(/No notifications yet/)).toBeInTheDocument();
  });
});
