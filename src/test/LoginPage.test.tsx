import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../pages/LoginPage';
import { makeStore } from '../store';
import api from '../services/api';

vi.mock('../services/api', async (orig) => {
  const actual = await orig<typeof import('../services/api')>();
  return { ...actual, default: { post: vi.fn(), get: vi.fn() } };
});

const renderPage = (store = makeStore()) =>
  render(<Provider store={store}><MemoryRouter><LoginPage /></MemoryRouter></Provider>);

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows validation errors and does not call the API for invalid input', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits credentials and stores the session', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { accessToken: 'tok', user: { id: 1, email: 'a@b.com', fullName: 'Ann', role: 'USER' } } });
    const store = makeStore();
    renderPage(store);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(store.getState().auth.accessToken).toBe('tok'));
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'secret123' });
  });

  it('shows the server error message when login fails', async () => {
    vi.mocked(api.post).mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Invalid email or password' } } });
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText(/Invalid email or password|Unexpected error|Request failed/)).toBeInTheDocument();
  });
});
