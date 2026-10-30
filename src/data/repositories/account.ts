import type { AccountClient } from '../api/account';
import {
  onboardingSchema,
  clientSettingsSchema,
} from '../../../shared/account';
import type {
  AuthRepository,
  Repositories,
  SettingsRepository,
} from './interfaces';
import type { DemoSettings, OnboardingState, UserProfile } from '../models';
import { readStored, writeStored } from '../../utils/storage';
const defaults: DemoSettings = {
  locale: 'de-DE',
  privacy: 'private',
  duration: 'varied',
  circleVisibility: 'private',
  notifications: false,
  appearance: 'system',
};
class AccountSettingsRepository implements SettingsRepository {
  constructor(
    private client: AccountClient | null,
    private uid: string,
  ) {}
  getSettings() {
    return readStored(
      `account.${this.uid}.settings`,
      defaults,
      (value): value is DemoSettings =>
        clientSettingsSchema.safeParse(value).success,
    );
  }
  saveSettings(value: DemoSettings) {
    writeStored(`account.${this.uid}.settings`, value);
  }
  getOnboarding() {
    return (
      this.client?.snapshot().onboarding ?? {
        step: 0,
        completed: false,
        preferences: {
          activities: [],
          duration: 'varied',
          frequency: 'flexible',
          priorities: [],
        },
        privacy: 'private',
      }
    );
  }
  async saveOnboarding(state: OnboardingState) {
    if (!this.client) throw Error('Account unavailable');
    await this.client.saveOnboarding(onboardingSchema.parse(state));
  }
}
export function createAccountRepositories(
  client: AccountClient | null,
  uid: string,
  auth: AuthRepository,
): Repositories {
  return {
    auth,
    settings: new AccountSettingsRepository(client, uid),
    programs: {
      async getPrograms() {
        return [];
      },
      async getSessions() {
        return [];
      },
    },
    library: {
      async getOverview() {
        return {
          mainProgramId: '',
          nextSessionPosition: 0,
          weeklySessionCounts: [0, 0, 0, 0, 0, 0, 0],
          weeklyMinutes: 0,
        };
      },
      async getLibrary() {
        return [];
      },
      async toggleSaved() {
        throw Error('Program saving not implemented');
      },
    },
    profile: {
      async getProfile(): Promise<UserProfile> {
        if (!client) throw Error('Account unavailable');
        const a = client.snapshot();
        return {
          id: a.uid,
          displayName: a.displayName,
          username: a.username,
          bio: a.bio,
          interests: a.onboarding.preferences.activities,
          privacy: {
            profile: a.onboarding.privacy,
            progress: 'private',
            notes: 'private',
          },
          followers: 0,
          following: 0,
          annualGoal: 0,
          sessionsThisYear: 0,
          minutesThisYear: 0,
        };
      },
      async getUsers() {
        return [];
      },
      async getReviews() {
        return [];
      },
    },
    circles: {
      async getCircles() {
        return [];
      },
      async getPosts() {
        return [];
      },
    },
  };
}
