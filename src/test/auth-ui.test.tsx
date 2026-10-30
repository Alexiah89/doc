import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { App } from '../app/App';
import type { AuthDriver, AuthIdentity } from '../data/firebase/auth';
import { newOnboarding, type Account } from '../../shared/account';
class Driver implements AuthDriver {
  current: AuthIdentity | null = null;
  listeners = new Set<(user: AuthIdentity | null) => void>();
  subscribe(callback: (user: AuthIdentity | null) => void) {
    this.listeners.add(callback);
    queueMicrotask(() => {
      if (this.listeners.has(callback)) callback(this.current);
    });
    return () => {
      this.listeners.delete(callback);
    };
  }
  async signIn() {}
  async signOut() {
    this.current = null;
    for (const cb of this.listeners) cb(null);
  }
  async getToken() {
    return 'test-token';
  }
}
const ready = (): Account => ({
  uid: 'test-user',
  displayName: 'Private User',
  username: 'private-user',
  bio: 'Private bio',
  onboarding: { ...newOnboarding(), completed: true, step: 3 },
  revision: 1,
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
});
afterEach(() => vi.unstubAllGlobals());
function mockAccount(value = ready()) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ account: value }))),
  );
}
function Back() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Test back</button>;
}
describe('Authentication UI and route policy', () => {
  it('prevents duplicate login and presents cancellation as a neutral status', async () => {
    sessionStorage.setItem('flowcircle.mode', 'live');
    const auth = new Driver();
    let reject: (reason: unknown) => void = () => {};
    auth.signIn = vi.fn(
      () =>
        new Promise<void>((_resolve, fail) => {
          reject = fail;
        }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App authDriver={auth} />
      </MemoryRouter>,
    );
    await user.dblClick(
      await screen.findByRole('button', { name: 'Mit Google anmelden' }),
    );
    expect(auth.signIn).toHaveBeenCalledTimes(1);
    await act(async () => reject({ code: 'auth/popup-closed-by-user' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Die Anmeldung wurde abgebrochen.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it.each(['/home', '/profile', '/library'])(
    'redirects guest %s to login',
    async (path) => {
      sessionStorage.setItem('flowcircle.mode', 'live');
      render(
        <MemoryRouter initialEntries={[path]}>
          <App authDriver={new Driver()} />
        </MemoryRouter>,
      );
      await screen.findByRole('heading', { name: 'Willkommen bei FlowCircle' });
    },
  );
  it('redirects a completed user away from onboarding without a loop', async () => {
    sessionStorage.setItem('flowcircle.mode', 'live');
    const auth = new Driver();
    auth.current = { uid: 'test-user', displayName: 'Private User' };
    mockAccount();
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <App authDriver={auth} />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', {
      name: 'Schön, dass du da bist, Private User.',
    });
    expect(
      screen.queryByRole('heading', { name: 'Was möchtest du gerne machen?' }),
    ).not.toBeInTheDocument();
  });
  it.each(['suspended', 'deleted', 'deletion_pending'] as const)(
    'blocks normal content for account status %s',
    async (status) => {
      sessionStorage.setItem('flowcircle.mode', 'live');
      const auth = new Driver();
      auth.current = { uid: 'test-user', displayName: 'Private User' };
      mockAccount({ ...ready(), accountStatus: status });
      render(
        <MemoryRouter initialEntries={['/home']}>
          <App authDriver={auth} />
        </MemoryRouter>,
      );
      await screen.findByRole('heading', { name: 'Kontostatus' });
      expect(screen.queryByText('Private bio')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('heading', {
          name: 'Schön, dass du da bist, Private User.',
        }),
      ).not.toBeInTheDocument();
    },
  );
  it('clears private repository state and keeps Browser Back guarded after logout', async () => {
    sessionStorage.setItem('flowcircle.mode', 'live');
    localStorage.setItem(
      'flowcircle.demo.v1.account.test-user.settings',
      'private',
    );
    const auth = new Driver();
    auth.current = { uid: 'test-user', displayName: 'Private User' };
    mockAccount();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/home', '/settings']} initialIndex={1}>
        <Back />
        <App authDriver={auth} />
      </MemoryRouter>,
    );
    await screen.findByRole('textbox', { name: 'Anzeigename' });
    await user.click(screen.getByRole('button', { name: 'Abmelden' }));
    await screen.findByRole('heading', { name: 'Willkommen bei FlowCircle' });
    expect(
      localStorage.getItem('flowcircle.demo.v1.account.test-user.settings'),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Test back' }));
    await waitFor(() =>
      expect(screen.queryByText('Private bio')).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('textbox', { name: 'Anzeigename' }),
    ).not.toBeInTheDocument();
  });
});
