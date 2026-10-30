import { z } from 'zod';
import {
  accountSchema,
  type Account,
  newOnboarding,
  type AccountOnboarding,
} from './account.js';
export const activityTypes = [
  'yoga',
  'pilates',
  'mobility',
  'stretching',
] as const;
export const durations = [
  'under_15',
  '15_25',
  '25_40',
  'over_40',
  'varies',
] as const;
export const frequencies = [
  '1_2_per_week',
  '3_per_week',
  '4_5_per_week',
  'almost_daily',
  'no_fixed_goal',
] as const;
export const trainingFocus = [
  'flexibility',
  'relaxation',
  'back_neck',
  'strength_stability',
  'morning_routine',
  'evening_routine',
  'returning',
  'consistency',
] as const;
export const profileVisibilitySchema = z.enum([
  'private',
  'protected',
  'public',
]);
export const accountStatusSchema = z.enum([
  'active',
  'suspended',
  'deletion_pending',
  'deleted',
]);
export const onboardingStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
]);
const unique = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(item)
    .max(max)
    .refine((v) => new Set(v).size === v.length);
export const userPreferencesSchema = z
  .object({
    activityTypes: unique(z.enum(activityTypes), 4),
    preferredSessionDuration: z.enum(durations),
    preferredFrequency: z.enum(frequencies),
    trainingFocus: unique(z.enum(trainingFocus), 8),
  })
  .strict();
export const privacySettingsSchema = z
  .object({
    profileVisibility: profileVisibilitySchema,
    progressVisibility: z.literal('private'),
    notes: z.literal('private'),
  })
  .strict();
export const onboardingDraftSchema = z
  .object({
    currentStep: z.number().int().min(1).max(4),
    preferences: userPreferencesSchema,
    profileVisibility: profileVisibilitySchema,
  })
  .strict();
const revision = z.number().int().nonnegative().optional();
export const draftPatchSchema = z
  .object({
    expectedRevision: revision,
    currentStep: z.number().int().min(1).max(4),
    partialPreferences: userPreferencesSchema.partial().optional(),
    profileVisibility: profileVisibilitySchema.optional(),
  })
  .strict();
export const completionSchema = z
  .object({
    expectedRevision: revision,
    preferences: userPreferencesSchema,
    profileVisibility: profileVisibilitySchema,
  })
  .strict();
export const preferencesPatchSchema = userPreferencesSchema
  .partial()
  .extend({
    locale: z.enum(['de-DE', 'en-US']).optional(),
    expectedRevision: revision,
  })
  .strict()
  .refine((x) => Object.keys(x).some((k) => k !== 'expectedRevision'));
export const privacyPatchSchema = z
  .object({
    expectedRevision: revision,
    profileVisibility: profileVisibilitySchema,
  })
  .strict();
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type ProfileVisibility = z.infer<typeof profileVisibilitySchema>;
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
export type AccountStatus = z.infer<typeof accountStatusSchema>;
export type DraftPatch = z.infer<typeof draftPatchSchema>;
export type Completion = z.infer<typeof completionSchema>;
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
export type PrivacyPatch = z.infer<typeof privacyPatchSchema>;
export const currentUserSchema = z
  .object({
    account: z
      .object({
        userId: z.string(),
        accountStatus: accountStatusSchema,
        onboardingStatus: onboardingStatusSchema,
        locale: z.enum(['de-DE', 'en-US']),
      })
      .strict(),
    profile: z
      .object({
        username: z.string(),
        displayName: z.string(),
        avatarUrl: z.string().nullable(),
        bio: z.string(),
        profileVisibility: profileVisibilitySchema,
        interests: unique(z.enum(activityTypes), 4),
      })
      .strict(),
    preferences: userPreferencesSchema,
    privacySettings: privacySettingsSchema,
    onboarding: z
      .object({
        currentStep: z.number().int().min(1).max(4).nullable(),
        draft: onboardingDraftSchema.nullable(),
      })
      .strict(),
    revision: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type CurrentUser = z.infer<typeof currentUserSchema>;
export function defaultPreferences(): UserPreferences {
  return {
    activityTypes: [],
    preferredSessionDuration: 'varies',
    preferredFrequency: 'no_fixed_goal',
    trainingFocus: [],
  };
}
const activityMap = {
  Yoga: 'yoga',
  Pilates: 'pilates',
  Mobility: 'mobility',
  Stretching: 'stretching',
} as const;
const durationMap = {
  short: 'under_15',
  medium: '15_25',
  long: '25_40',
  extended: 'over_40',
  varied: 'varies',
} as const;
const frequencyMap = {
  light: '1_2_per_week',
  regular: '3_per_week',
  often: '4_5_per_week',
  daily: 'almost_daily',
  flexible: 'no_fixed_goal',
} as const;
const focusMap = {
  flexibility: 'flexibility',
  relaxation: 'relaxation',
  back: 'back_neck',
  strength: 'strength_stability',
  morning: 'morning_routine',
  evening: 'evening_routine',
  restart: 'returning',
  consistency: 'consistency',
} as const;
function reverse<T extends Record<string, string>>(map: T, value: string) {
  return Object.entries(map).find(([, v]) => v === value)?.[0] as
    Extract<keyof T, string> | undefined;
}
export function canonicalPreferences(
  state: AccountOnboarding,
): UserPreferences {
  return userPreferencesSchema.parse({
    activityTypes: state.preferences.activities.map((a) => activityMap[a]),
    preferredSessionDuration:
      durationMap[state.preferences.duration as keyof typeof durationMap],
    preferredFrequency:
      frequencyMap[state.preferences.frequency as keyof typeof frequencyMap],
    trainingFocus: state.preferences.priorities.map(
      (f) => focusMap[f as keyof typeof focusMap],
    ),
  });
}
export function legacyPreferences(
  p: UserPreferences,
): AccountOnboarding['preferences'] {
  return {
    activities: p.activityTypes.map(
      (a) =>
        reverse(
          activityMap,
          a,
        ) as AccountOnboarding['preferences']['activities'][number],
    ),
    duration: reverse(durationMap, p.preferredSessionDuration)!,
    frequency: reverse(frequencyMap, p.preferredFrequency)!,
    priorities: p.trainingFocus.map((f) => reverse(focusMap, f)!),
  };
}
export function canonicalVisibility(
  v: AccountOnboarding['privacy'],
): ProfileVisibility {
  return v === 'followers' ? 'protected' : v;
}
export function legacyVisibility(
  v: ProfileVisibility,
): AccountOnboarding['privacy'] {
  return v === 'protected' ? 'followers' : v;
}
export function toLegacyAccount(user: CurrentUser): Account {
  const draft = user.onboarding.draft;
  return accountSchema.parse({
    uid: user.account.userId,
    displayName: user.profile.displayName,
    bio: user.profile.bio,
    username: user.profile.username,
    onboarding: {
      ...newOnboarding(),
      step:
        user.account.onboardingStatus === 'completed'
          ? 3
          : (user.onboarding.currentStep ?? 1) - 1,
      completed: user.account.onboardingStatus === 'completed',
      preferences: legacyPreferences(draft?.preferences ?? user.preferences),
      privacy: legacyVisibility(
        draft?.profileVisibility ?? user.profile.profileVisibility,
      ),
    },
    revision: user.revision,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    locale: user.account.locale,
    avatarUrl: user.profile.avatarUrl,
    accountStatus: user.account.accountStatus,
    onboardingStatus: user.account.onboardingStatus,
  });
}
