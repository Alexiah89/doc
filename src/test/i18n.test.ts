import { describe, expect, it } from 'vitest';
import { de } from '../i18n/de-DE';
import { en } from '../i18n/en-US';
import { translate } from '../i18n';
import { createDemoRepositories } from '../data/demo/repositories';
describe('i18n', () => {
  it('defaults to German and supplies important keys', () => {
    expect(createDemoRepositories().settings.getSettings().locale).toBe(
      'de-DE',
    );
    for (const key of [
      'nav.home',
      'nav.circles',
      'onboarding.privacy',
      'errors.notImplemented',
      'common.retry',
    ] as const)
      expect(de[key]).toBeTruthy();
  });
  it('interpolates values and falls back to complete German catalog', () => {
    expect(translate('de-DE', 'home.session', { current: 8, total: 30 })).toBe(
      'Session 8 von 30',
    );
    expect(translate('en-US', 'privacy.notes')).toBe(de['privacy.notes']);
  });
  it('preserves placeholders in prepared English translations', () => {
    for (const [key, value] of Object.entries(en)) {
      const source = de[key as keyof typeof de];
      expect(value.match(/\{\w+\}/g) ?? []).toEqual(
        source.match(/\{\w+\}/g) ?? [],
      );
    }
  });
});
