import { describe, expect, it } from 'vitest';
import { createDemoRepositories } from '../data/demo/repositories';
describe('Demo repositories', () => {
  it('provides required fixtures and independent copies', async () => {
    const r = createDemoRepositories();
    const programs = await r.programs.getPrograms();
    expect(programs).toHaveLength(8);
    expect(new Set(programs.map((p) => p.creator.id)).size).toBe(4);
    expect(await r.profile.getUsers()).toHaveLength(6);
    expect(await r.circles.getCircles()).toHaveLength(4);
    expect(await r.profile.getReviews()).toHaveLength(2);
    programs[0].title = 'mutated';
    expect((await r.programs.getPrograms())[0].title).toBe('Inner Awakening');
    expect(await r.auth.getCurrentUser()).toBeNull();
    await r.auth.startDemo();
    expect(await r.auth.getCurrentUser()).toBeNull();
  });
  it('supports saving and unsaving without altering active runs', async () => {
    const r = createDemoRepositories();
    await r.library.toggleSaved('demo-program-7');
    expect(
      (await r.library.getLibrary()).find(
        (x) => x.programId === 'demo-program-7',
      )?.status,
    ).toBe('saved');
    await r.library.toggleSaved('demo-program-7');
    expect(
      (await r.library.getLibrary()).some(
        (x) => x.programId === 'demo-program-7',
      ),
    ).toBe(false);
    const before = await r.library.getLibrary();
    await r.library.toggleSaved('demo-program-0');
    expect(await r.library.getLibrary()).toEqual(before);
  });
  it('ignores invalid or corrupt local onboarding safely', () => {
    const r = createDemoRepositories();
    for (const data of [
      '{broken',
      JSON.stringify({ step: 99 }),
      JSON.stringify({
        step: 1,
        completed: false,
        privacy: 'public',
        preferences: {
          activities: ['invalid'],
          duration: 'varied',
          frequency: 'flexible',
          priorities: [],
        },
      }),
    ]) {
      localStorage.setItem('flowcircle.demo.v1.onboarding', data);
      expect(r.settings.getOnboarding().privacy).toBe('private');
      expect(r.settings.getOnboarding().step).toBe(0);
    }
  });
});
