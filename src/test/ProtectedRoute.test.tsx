import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ProtectedRoute from '../routes/ProtectedRoute';
import { makeStore } from '../store';
import type { User } from '../types';

const user = (role: User['role']): User => ({ id: 1, email: 'a@b.com', fullName: 'Ann', role });
const auth = (u: User | null, initializing = false) => ({ auth: { user: u, accessToken: u ? 't' : null, initializing, loading: false, error: null } });

const renderAt = (state: ReturnType<typeof auth>, role?: User['role']) =>
  render(
    <Provider store={makeStore(state)}>
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route path="/" element={<div>Home</div>} />
          <Route element={<ProtectedRoute role={role} />}><Route path="/secret" element={<div>Secret data</div>} /></Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

describe('ProtectedRoute', () => {
  it('redirects anonymous visitors to login', () => {
    renderAt(auth(null));
    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });
  it('shows a loader while the session is being restored', () => {
    renderAt(auth(null, true));
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('Login screen')).not.toBeInTheDocument();
  });
  it('renders the page for a signed-in user', () => {
    renderAt(auth(user('USER')));
    expect(screen.getByText('Secret data')).toBeInTheDocument();
  });
  it('keeps normal users out of admin-only routes', () => {
    renderAt(auth(user('USER')), 'ADMIN');
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
