import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../app/App';
import { appConfig } from '../app/config';
import { createDemoRepositories } from '../data/demo/repositories';
import type { Repositories } from '../data/repositories/interfaces';
function mount(path = '/', repositories?: Repositories, development = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App repositories={repositories} development={development} />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  sessionStorage.setItem('flowcircle.mode', 'demo');
});
const names = ['Home', 'Entdecken', 'Bibliothek', 'Circles', 'Profil'];
describe('App and navigation', () => {
  it('does not simulate live functionality when demo mode is disabled', () => {
    const previous = appConfig.demoMode;
    try {
      appConfig.demoMode = false;
      sessionStorage.removeItem('flowcircle.mode');
      mount('/home');
      expect(
        screen.getByRole('heading', { name: 'Willkommen bei FlowCircle' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Training starten' }),
      ).not.toBeInTheDocument();
    } finally {
      appConfig.demoMode = previous;
    }
  });
  it('renders welcome and does not simulate Google authentication', async () => {
    const user = userEvent.setup();
    mount();
    expect(
      screen.getByRole('heading', {
        name: 'Deine YouTube-Programme. Dein Fortschritt. Deine Circles.',
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Mit Google anmelden' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Die Anmeldung ist noch nicht vollständig konfiguriert.',
    );
    expect(
      screen.queryByText(/erfolgreich angemeldet/i),
    ).not.toBeInTheDocument();
  });
  it('contains exactly the five main entries and navigates to every page', async () => {
    const user = userEvent.setup();
    mount();
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((x) => x.textContent),
    ).toEqual(names);
    const mobile = screen.getByRole('navigation', {
      name: 'Mobile Hauptnavigation',
    });
    expect(
      within(mobile)
        .getAllByRole('link')
        .map((x) => x.textContent),
    ).toEqual(names);
    for (const name of names) {
      await user.click(within(nav).getByRole('link', { name }));
      await screen.findByRole('heading', {
        level: 1,
        name: name === 'Home' ? 'Schön, dass du da bist.' : name,
      });
    }
  });
  it('handles an unknown route', () => {
    mount('/not-a-route');
    expect(
      screen.getByRole('heading', { name: 'Diese Seite gibt es nicht.' }),
    ).toBeInTheDocument();
  });
  it('hides diagnostics in production', () => {
    mount('/dev/demo', undefined, false);
    expect(
      screen.getByRole('heading', { name: 'Diese Seite gibt es nicht.' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Entwicklungsdiagnose' }),
    ).not.toBeInTheDocument();
  });
  it('starts demo onboarding without asserting a real login', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('button', { name: 'Demo ansehen' }));
    expect(
      screen.getByRole('heading', { name: 'Was möchtest du gerne machen?' }),
    ).toBeInTheDocument();
  });
  it('shows the unavailable player message and no session completion', async () => {
    const user = userEvent.setup();
    mount('/home');
    await screen.findByRole('heading', { name: 'Inner Awakening', level: 2 });
    expect(screen.getByText('Session 8 von 30')).toBeInTheDocument();
    expect(screen.getAllByText('27%').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Training starten' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Der Session-Player wird in einem späteren Sprint aktiviert.',
    );
    expect(
      screen.queryByRole('button', { name: /abschließen/i }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('iframe,video')).toBeNull();
  });
});
describe('Onboarding', () => {
  it('supports four steps, back, skip, completion and private default', async () => {
    const user = userEvent.setup();
    const repos = createDemoRepositories();
    mount('/onboarding', repos);
    expect(repos.settings.getOnboarding().privacy).toBe('private');
    await user.click(screen.getByRole('button', { name: 'Yoga' }));
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(
      screen.getByRole('heading', { name: 'Was passt in deinen Alltag?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '15–25 Minuten' }));
    await user.click(screen.getByRole('radio', { name: '3-mal pro Woche' }));
    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(screen.getByRole('button', { name: 'Yoga' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByRole('radio', { name: '15–25 Minuten' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Überspringen' }));
    await user.click(screen.getByRole('button', { name: 'Entspannung' }));
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByRole('radio', { name: 'Privat starten' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Demo starten' }));
    expect(
      await screen.findByRole('heading', { name: 'Schön, dass du da bist.' }),
    ).toBeInTheDocument();
    expect(repos.settings.getOnboarding()).toMatchObject({
      completed: true,
      step: 3,
      privacy: 'private',
      preferences: {
        activities: ['Yoga'],
        duration: 'medium',
        frequency: 'regular',
        priorities: ['relaxation'],
      },
    });
  });
  it('resumes after remount with a new repository instance', async () => {
    const user = userEvent.setup();
    const view = mount('/onboarding');
    await user.click(screen.getByRole('button', { name: 'Mobility' }));
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    view.unmount();
    mount('/onboarding');
    expect(
      screen.getByRole('heading', { name: 'Was passt in deinen Alltag?' }),
    ).toBeInTheDocument();
    expect(
      createDemoRepositories().settings.getOnboarding().preferences.activities,
    ).toEqual(['Mobility']);
  });
  it('does not claim completion when storage fails', async () => {
    const repos = createDemoRepositories();
    repos.settings.saveOnboarding = () => {
      throw Error('quota');
    };
    const user = userEvent.setup();
    mount('/onboarding', repos);
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Die lokale Speicherung ist nicht verfügbar.',
    );
    expect(
      screen.getByRole('heading', { name: 'Was möchtest du gerne machen?' }),
    ).toBeInTheDocument();
  });
});
describe('Library and discovery', () => {
  it('renders every library status, switches views and sorts by title', async () => {
    const user = userEvent.setup();
    mount('/library');
    await screen.findByRole('heading', { name: 'Inner Awakening' });
    for (const name of [
      'Gespeichert',
      'Pausiert',
      'Abgeschlossen',
      'Favoriten',
    ]) {
      await user.click(screen.getByRole('button', { name }));
      expect(document.querySelectorAll('.program-card').length).toBeGreaterThan(
        0,
      );
    }
    await user.selectOptions(screen.getByLabelText('Ansicht'), 'list');
    expect(document.querySelectorAll('.library-row').length).toBe(2);
    await user.selectOptions(screen.getByLabelText('Sortieren'), 'title');
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((x) => x.textContent),
    ).toEqual(['Inner Awakening', 'Zeit zum Loslassen']);
  });
  it('renders empty state from an empty repository', async () => {
    const repos = createDemoRepositories();
    repos.library.getLibrary = async () => [];
    mount('/library', repos);
    expect(
      await screen.findByRole('heading', {
        name: 'Hier ist Platz für deinen nächsten Flow.',
      }),
    ).toBeInTheDocument();
  });
  it('filters programs and searches creators without video results', async () => {
    const user = userEvent.setup();
    mount('/discover');
    await screen.findAllByRole('heading', { name: 'Stärke aus deiner Mitte' });
    await user.click(screen.getByRole('button', { name: 'Pilates' }));
    expect(
      screen.queryByRole('heading', { name: 'Inner Awakening' }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'no-matching-title');
    expect(
      screen.getByRole('heading', {
        name: 'Hier ist Platz für deinen nächsten Flow.',
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', {
        name: 'Öffentliche YouTube-Playlist hinzufügen',
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Es wird keine YouTube-Suche ausgeführt.',
    );
    expect(document.querySelector('iframe,video')).toBeNull();
  });
  it('retries a failing repository without exposing the exception', async () => {
    const repos = createDemoRepositories();
    const original = repos.programs.getPrograms;
    repos.programs.getPrograms = async () => {
      throw Error('private internal stack');
    };
    const user = userEvent.setup();
    mount('/discover', repos);
    await screen.findByRole('alert');
    expect(
      screen.queryByText('private internal stack'),
    ).not.toBeInTheDocument();
    repos.programs.getPrograms = original;
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    await screen.findAllByRole('heading', { name: 'Inner Awakening' });
  });
});
describe('Product rules, settings and localization', () => {
  it('explains demo account status and links to real sign-in without a stale sprint promise', async () => {
    const user = userEvent.setup();
    mount('/settings');
    expect(
      screen.getByText(
        'Du nutzt den Demo-Modus. Für dein echtes Konto öffne die Google-Anmeldung.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Anmeldung wird im nächsten Sprint/),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Mit Google anmelden' }));
    expect(
      screen.getByRole('heading', { name: 'Willkommen bei FlowCircle' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Mit Google anmelden' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Die Anmeldung ist noch nicht vollständig konfiguriert.',
    );
    expect(
      screen.queryByText(/Anmeldung wird im nächsten Sprint/),
    ).not.toBeInTheDocument();
  });

  it('uses Circles consistently and excludes out-of-scope product controls', async () => {
    mount('/profile');
    await screen.findByRole('heading', { name: 'Alex' });
    expect(document.body.textContent).not.toMatch(
      /Community|Sammlungen|Kalorien|Rankings/,
    );
    expect(screen.getAllByRole('link', { name: 'Circles' })).toHaveLength(2);
  });
  it('saves local settings and switches language with fallback', async () => {
    const user = userEvent.setup();
    const view = mount('/settings');
    expect(
      screen.getByText('Private Notizen sind immer privat.'),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Sprache wählen'), 'en-US');
    await user.click(
      screen.getByRole('button', { name: 'Demo-Einstellungen speichern' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Demo settings saved on this device.',
    );
    view.unmount();
    mount('/settings');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument();
    expect(createDemoRepositories().settings.getSettings().locale).toBe(
      'en-US',
    );
  });
  it('shows an offline notice', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    mount('/');
    expect(screen.getByRole('status')).toHaveTextContent('Du bist offline.');
    if (original) Object.defineProperty(navigator, 'onLine', original);
    else
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });
  });
  it('uses private defaults in new settings', async () => {
    const repos = createDemoRepositories();
    await waitFor(() =>
      expect(repos.settings.getSettings().privacy).toBe('private'),
    );
    expect(repos.settings.getSettings().circleVisibility).toBe('private');
  });
});
