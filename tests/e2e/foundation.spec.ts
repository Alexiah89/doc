import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.startsWith('production account'))
    await page.addInitScript(() =>
      sessionStorage.setItem('flowcircle.mode', 'demo'),
    );
});
for (const [label, width] of [
  ['phone', 390],
  ['tablet', 820],
  ['desktop', 1440],
] as const) {
  test(`${label}: navigation, layout, touch targets and routes`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/home');
    await expect(
      page.getByRole('heading', { name: 'Schön, dass du da bist.' }),
    ).toBeVisible();
    const nav = page.getByRole('navigation', {
      name: width < 600 ? 'Mobile Hauptnavigation' : 'Hauptnavigation',
      exact: true,
    });
    await expect(nav).toBeVisible();
    await expect(
      page.getByRole('navigation', {
        name: width < 600 ? 'Hauptnavigation' : 'Mobile Hauptnavigation',
        exact: true,
      }),
    ).toBeHidden();
    expect(await nav.getByRole('link').allTextContents()).toEqual([
      'Home',
      'Entdecken',
      'Bibliothek',
      'Circles',
      'Profil',
    ]);
    if (width >= 600) {
      const sidebar = page.locator('.sidebar');
      expect(Math.round((await sidebar.boundingBox())!.width)).toBe(
        width < 1200 ? 88 : 240,
      );
    }
    for (const [name, title] of [
      ['Entdecken', 'Entdecken'],
      ['Bibliothek', 'Bibliothek'],
      ['Circles', 'Circles'],
      ['Profil', 'Profil'],
      ['Home', 'Schön, dass du da bist.'],
    ]) {
      await nav.getByRole('link', { name, exact: true }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: title, exact: true }),
      ).toBeVisible();
      await expect(page.locator('.skeleton')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    }
    for (const link of await nav.getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: `test-results/${label}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
test('onboarding survives reload, skip/back/finish work, default remains private', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Demo ansehen' }).click();
  await page.getByRole('button', { name: 'Yoga', exact: true }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('radio', { name: '15–25 Minuten' }).check();
  await page.reload();
  await expect(
    page.getByRole('radio', { name: '15–25 Minuten' }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(
    page.getByRole('button', { name: 'Yoga', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await expect(
    page.getByRole('radio', { name: 'Privat starten' }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Demo starten' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto('/');
  await page.getByRole('button', { name: 'Demo ansehen' }).click();
  await expect(page).toHaveURL(/\/home$/);
});
test('all direct routes work and dev health is available only in development', async ({
  page,
}) => {
  for (const path of [
    '/',
    '/login',
    '/onboarding',
    '/home',
    '/discover',
    '/library',
    '/circles',
    '/profile',
    '/settings',
    '/dev/demo',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Diese Seite gibt es nicht.' }),
    ).toHaveCount(0);
  }
  await expect(
    page.getByText('Backend erreichbar', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Demo-Programme: 8', { exact: true }),
  ).toBeVisible();
  await page.goto('http://127.0.0.1:4174/dev/demo');
  await expect(
    page.getByRole('heading', { name: 'Diese Seite gibt es nicht.' }),
  ).toBeVisible();
  await page.goto('http://127.0.0.1:4174/discover');
  await expect(
    page.getByRole('heading', { name: 'Entdecken', level: 1 }),
  ).toBeVisible();
});
test('keyboard focus, reduced motion and 200% zoom equivalent reflow', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Zum Inhalt springen' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  for (const path of [
    '/',
    '/home',
    '/discover',
    '/onboarding',
    '/settings',
    '/profile',
    '/circles',
    '/library',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.skeleton')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
});
test('production health and 501 stubs through the same-origin proxy', async ({
  request,
}) => {
  const health = await request.get('http://127.0.0.1:4174/api/v1/health');
  expect(health.status()).toBe(200);
  expect((await health.json()).status).toBe('ok');
  for (const path of ['playlists/inspect', 'programs/import']) {
    const response = await request.post(
      `http://127.0.0.1:4174/api/v1/${path}`,
      { data: {} },
    );
    expect(response.status()).toBe(501);
    expect(await response.json()).toEqual({
      code: 'not-implemented',
      userMessageKey: 'errors.notImplemented',
      retryable: false,
      details: {},
    });
  }
});

test('production account routes require login and keep demo entry explicit without Firebase config', async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('flowcircle.mode', 'live'),
  );
  await page.goto('http://127.0.0.1:4174/profile');
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Willkommen bei FlowCircle' }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Anzeigename' })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Mit Google anmelden' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Die Anmeldung ist noch nicht vollständig konfiguriert.',
  );
  await page.getByRole('button', { name: 'Demo ansehen' }).click();
  await expect(
    page.getByRole('heading', { name: 'Was möchtest du gerne machen?' }),
  ).toBeVisible();
  await expect(
    page.getByText('Demo · Beispieldaten', { exact: true }),
  ).toBeVisible();
});

test('four demo onboarding steps are keyboard-operable', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Yoga', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(
    page.getByRole('button', { name: 'Yoga', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Weiter', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('radio', { name: 'Unter 15 Minuten' }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Weiter', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Entspannung', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Weiter', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('radio', { name: 'Privat starten' }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Demo starten', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/home$/);
});
