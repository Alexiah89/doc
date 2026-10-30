import type {
  AuthRepository,
  CircleRepository,
  LibraryRepository,
  ProfileRepository,
  ProgramRepository,
  Repositories,
  SettingsRepository,
} from '../repositories/interfaces';
import type {
  ActivityType,
  DemoSettings,
  OnboardingState,
  UserProgram,
} from '../models';
import * as fixtures from './fixtures';
import { readStored, writeStored } from '../../utils/storage';
export const defaultSettings: DemoSettings = {
  locale: 'de-DE',
  privacy: 'private',
  duration: 'varied',
  circleVisibility: 'private',
  notifications: false,
  appearance: 'system',
};
export const defaultOnboarding: OnboardingState = {
  step: 0,
  completed: false,
  preferences: {
    activities: [],
    duration: 'varied',
    frequency: 'flexible',
    priorities: [],
  },
  privacy: 'private',
};
const visibility = (x: unknown) =>
  ['private', 'followers', 'public'].includes(String(x));
const object = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null;
const strings = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((v) => typeof v === 'string');
const activities: ActivityType[] = [
  'Yoga',
  'Pilates',
  'Mobility',
  'Stretching',
];
export function isOnboarding(x: unknown): x is OnboardingState {
  return (
    object(x) &&
    Number.isInteger(x.step) &&
    Number(x.step) >= 0 &&
    Number(x.step) <= 3 &&
    typeof x.completed === 'boolean' &&
    visibility(x.privacy) &&
    object(x.preferences) &&
    strings(x.preferences.activities) &&
    x.preferences.activities.every((v) =>
      activities.includes(v as ActivityType),
    ) &&
    typeof x.preferences.duration === 'string' &&
    typeof x.preferences.frequency === 'string' &&
    strings(x.preferences.priorities)
  );
}
function isSettings(x: unknown): x is DemoSettings {
  return (
    object(x) &&
    (x.locale === 'de-DE' || x.locale === 'en-US') &&
    visibility(x.privacy) &&
    typeof x.duration === 'string' &&
    (x.circleVisibility === 'private' || x.circleVisibility === 'members') &&
    typeof x.notifications === 'boolean' &&
    (x.appearance === 'light' || x.appearance === 'system')
  );
}
const copy = <T>(x: T): T => structuredClone(x);
export class DemoAuthRepository implements AuthRepository {
  async getCurrentUser() {
    return null;
  }
  async startDemo() {
    return copy(fixtures.users[0]);
  }
}
export class DemoProgramRepository implements ProgramRepository {
  async getPrograms() {
    return copy(fixtures.programs);
  }
  async getSessions(id: string) {
    return copy(fixtures.sessions.filter((s) => s.programId === id));
  }
}
export class DemoLibraryRepository implements LibraryRepository {
  private entries = copy(fixtures.library);
  async getOverview() {
    return copy(fixtures.overview);
  }
  async getLibrary() {
    return copy(this.entries);
  }
  async toggleSaved(id: string) {
    if (!fixtures.programs.some((p) => p.id === id))
      throw new Error('Unknown demo program');
    const existing = this.entries.find((p) => p.programId === id);
    if (existing?.status === 'saved') {
      this.entries = this.entries.filter((p) => p.programId !== id);
    } else if (!existing) {
      const entry: UserProgram = {
        programId: id,
        status: 'saved',
        favorite: false,
        progress: { completedSessions: 0, trackableSessions: 0, percent: 0 },
        savedAt: new Date().toISOString(),
      };
      this.entries.push(entry);
    }
    return this.getLibrary();
  }
}
export class DemoProfileRepository implements ProfileRepository {
  async getProfile() {
    return copy(fixtures.profile);
  }
  async getUsers() {
    return copy(fixtures.users);
  }
  async getReviews() {
    return copy(fixtures.reviews);
  }
}
export class DemoCircleRepository implements CircleRepository {
  async getCircles() {
    return copy(fixtures.circles);
  }
  async getPosts() {
    return copy(fixtures.posts);
  }
}
export class DemoSettingsRepository implements SettingsRepository {
  getSettings() {
    return readStored('settings', copy(defaultSettings), isSettings);
  }
  saveSettings(settings: DemoSettings) {
    writeStored('settings', settings);
  }
  getOnboarding() {
    return readStored('onboarding', copy(defaultOnboarding), isOnboarding);
  }
  saveOnboarding(state: OnboardingState) {
    writeStored('onboarding', state);
  }
}
export function createDemoRepositories(): Repositories {
  return {
    auth: new DemoAuthRepository(),
    programs: new DemoProgramRepository(),
    library: new DemoLibraryRepository(),
    profile: new DemoProfileRepository(),
    circles: new DemoCircleRepository(),
    settings: new DemoSettingsRepository(),
  };
}
