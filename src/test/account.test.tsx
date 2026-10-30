import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import type { AuthDriver, AuthIdentity } from '../data/firebase/auth';
import { appConfig } from '../app/config';
import { newOnboarding, type Account } from '../../shared/account';
class FakeAuth implements AuthDriver {
  user: AuthIdentity | null = null;
  listeners = new Set<(user: AuthIdentity | null) => void>();
  subscribe(callback: (user: AuthIdentity | null) => void) {
    this.listeners.add(callback);
    queueMicrotask(() => {
      if (this.listeners.has(callback)) callback(this.user);
    });
    return () => {
      this.listeners.delete(callback);
    };
  }
  async signIn() {
    this.user = { uid: 'account-test-user', displayName: 'Alex' };
    for (const cb of this.listeners) cb(this.user);
  }
  async signOut() {
    this.user = null;
    for (const cb of this.listeners) cb(null);
  }
  async getToken() {
    return 'test-only-token';
  }
}
function mockApi(initial?: Account) {
  let account: Account = initial ?? {
    uid: 'account-test-user',
    displayName: 'Alex',
    username: 'user_account-test-user',
    bio: '',
    onboarding: newOnboarding(),
    revision: 0,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z',
  };
  let fail = false;
  let failureCode = 'failed';
  const calls: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const body = init?.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : undefined;
      calls.push({ url: input, method: init?.method ?? 'GET', body });
      if (fail)
        return new Response(JSON.stringify({ code: failureCode }), {
          status: 503,
        });
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        'Bearer test-only-token',
      );
      if (init?.method === 'PUT')
        account = {
          ...account,
          onboarding: body!.onboarding as Account['onboarding'],
          revision: account.revision + 1,
        };
      if (init?.method === 'PATCH')
        account = {
          ...account,
          ...(body!.profile as { displayName: string; bio: string }),
          revision: account.revision + 1,
        };
      return new Response(JSON.stringify({ account }), { status: 200 });
    }),
  );
  return {
    calls,
    getAccount: () => account,
    setFail: (value: boolean, code = 'failed') => {
      fail = value;
      failureCode = code;
    },
  };
}
function mount(driver: AuthDriver, path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App authDriver={driver} />
    </MemoryRouter>,
  );
}
afterEach(() => vi.unstubAllGlobals());
describe('Account flow with mocked Firebase identity and API', () => {
  it('shows an actionable configuration error without exposing credentials', async () => {
    const auth = new FakeAuth();
    auth.user = { uid: 'account-test-user', displayName: 'Alex' };
    const api = mockApi();
    api.setFail(true, 'firebase-project-id-missing');
    sessionStorage.setItem('flowcircle.mode', 'live');
    mount(auth, '/home');
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(
      'Im Server-Deployment fehlt FIREBASE_PROJECT_ID.',
    );
    expect(error).toHaveTextContent('Fehlercode: firebase-project-id-missing');
    expect(error).not.toHaveTextContent('test-only-token');
  });

  it('redirects signed-out live users to login', async () => {
    sessionStorage.setItem('flowcircle.mode', 'live');
    const auth = new FakeAuth();
    mockApi();
    mount(auth, '/settings');
    expect(
      await screen.findByRole('heading', { name: 'Willkommen bei FlowCircle' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Anzeigename' }),
    ).not.toBeInTheDocument();
  });
  it('signs in, starts private, saves onboarding to the API and restores it after remount', async () => {
    const user = userEvent.setup();
    const auth = new FakeAuth();
    const api = mockApi();
    mount(auth);
    await user.click(
      await screen.findByRole('button', { name: 'Mit Google anmelden' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Was möchtest du gerne machen?',
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yoga' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Yoga' })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    await screen.findByRole('heading', { name: 'Was passt in deinen Alltag?' });
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    await screen.findByRole('heading', {
      name: 'Was ist dir besonders wichtig?',
    });
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(
      await screen.findByRole('radio', { name: 'Privat starten' }),
    ).toBeChecked();
    await user.click(
      screen.getByRole('button', { name: 'Onboarding abschließen' }),
    );
    await screen.findByRole('heading', {
      name: 'Schön, dass du da bist, Alex.',
    });
    expect(api.getAccount().onboarding).toMatchObject({
      completed: true,
      privacy: 'private',
      preferences: { activities: ['Yoga'] },
    });
    expect(localStorage.getItem('flowcircle.demo.v1.onboarding')).toBeNull();
    cleanup();
    mount(auth, '/home');
    await screen.findByRole('heading', {
      name: 'Schön, dass du da bist, Alex.',
    });
    expect(
      api.calls.filter((x) => x.method === 'GET').length,
    ).toBeGreaterThanOrEqual(2);
  });
  it('does not upload existing demo preferences into a new real account', async () => {
    localStorage.setItem(
      'flowcircle.demo.v1.onboarding',
      JSON.stringify({
        ...newOnboarding(),
        step: 3,
        completed: true,
        privacy: 'public',
        preferences: {
          ...newOnboarding().preferences,
          activities: ['Pilates'],
        },
      }),
    );
    const auth = new FakeAuth();
    auth.user = { uid: 'account-test-user', displayName: 'Alex' };
    const api = mockApi();
    sessionStorage.setItem('flowcircle.mode', 'live');
    mount(auth, '/home');
    await screen.findByRole('heading', {
      name: 'Was möchtest du gerne machen?',
    });
    expect(screen.getByRole('button', { name: 'Pilates' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(api.calls.every((x) => x.method === 'GET')).toBe(true);
  });
  it('does not claim onboarding success when the API is unavailable', async () => {
    const auth = new FakeAuth();
    auth.user = { uid: 'account-test-user', displayName: 'Alex' };
    const api = mockApi();
    sessionStorage.setItem('flowcircle.mode', 'live');
    const user = userEvent.setup();
    mount(auth, '/onboarding');
    await screen.findByRole('heading', {
      name: 'Was möchtest du gerne machen?',
    });
    api.setFail(true);
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Deine Änderungen konnten nicht gespeichert werden.',
    );
    expect(
      screen.getByRole('heading', { name: 'Was möchtest du gerne machen?' }),
    ).toBeInTheDocument();
    expect(api.getAccount().onboarding.step).toBe(0);
  });
  it('updates a real profile and removes protected data after sign-out', async () => {
    const auth = new FakeAuth();
    auth.user = { uid: 'account-test-user', displayName: 'Alex' };
    const initial: Account = {
      uid: 'account-test-user',
      displayName: 'Alex',
      username: 'user_account-test-user',
      bio: '',
      onboarding: { ...newOnboarding(), step: 3, completed: true },
      revision: 2,
      createdAt: '2026-10-30T00:00:00.000Z',
      updatedAt: '2026-10-30T00:00:00.000Z',
    };
    const api = mockApi(initial);
    sessionStorage.setItem('flowcircle.mode', 'live');
    const user = userEvent.setup();
    mount(auth, '/settings');
    const input = await screen.findByRole('textbox', { name: 'Anzeigename' });
    await user.clear(input);
    await user.type(input, 'Alexandra');
    await user.click(screen.getByRole('button', { name: 'Profil speichern' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Dein Profil wurde in deinem Konto gespeichert.',
    );
    expect(api.getAccount().displayName).toBe('Alexandra');
    await user.click(screen.getByRole('button', { name: 'Abmelden' }));
    await screen.findByRole('heading', { name: 'Willkommen bei FlowCircle' });
    expect(
      screen.queryByRole('textbox', { name: 'Anzeigename' }),
    ).not.toBeInTheDocument();
  });
  it('keeps protected content hidden during initialization', async () => {
    const callbacks = new Set<(identity: AuthIdentity | null) => void>();
    const auth: AuthDriver = {
      subscribe(cb) {
        callbacks.add(cb);
        return () => {
          callbacks.delete(cb);
        };
      },
      async getToken() {
        return 'test';
      },
      async signIn() {},
      async signOut() {},
    };
    sessionStorage.setItem('flowcircle.mode', 'live');
    mount(auth, '/profile');
    expect(screen.getByRole('status')).toHaveTextContent('Wird geladen');
    expect(
      screen.queryByRole('heading', { name: 'Profil', level: 1 }),
    ).not.toBeInTheDocument();
    await act(async () => {
      for (const cb of callbacks) cb(null);
    });
    await screen.findByRole('heading', { name: 'Willkommen bei FlowCircle' });
  });
  it('uses live login as the default when demo mode is disabled', async () => {
    const previous = appConfig.demoMode;
    appConfig.demoMode = false;
    try {
      const auth = new FakeAuth();
      mount(auth, '/home');
      await screen.findByRole('heading', { name: 'Willkommen bei FlowCircle' });
    } finally {
      appConfig.demoMode = previous;
    }
  });
});
