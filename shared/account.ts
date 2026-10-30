import { z } from 'zod';
export const activitySchema = z.enum([
  'Yoga',
  'Pilates',
  'Mobility',
  'Stretching',
]);
export const visibilitySchema = z.enum(['private', 'followers', 'public']);
export const preferencesSchema = z
  .object({
    activities: z
      .array(activitySchema)
      .max(4)
      .refine((v) => new Set(v).size === v.length),
    duration: z.enum(['short', 'medium', 'long', 'extended', 'varied']),
    frequency: z.enum(['light', 'regular', 'often', 'daily', 'flexible']),
    priorities: z
      .array(
        z.enum([
          'flexibility',
          'relaxation',
          'back',
          'strength',
          'morning',
          'evening',
          'restart',
          'consistency',
        ]),
      )
      .max(8)
      .refine((v) => new Set(v).size === v.length),
  })
  .strict();
export const onboardingSchema = z
  .object({
    step: z.number().int().min(0).max(3),
    completed: z.boolean(),
    preferences: preferencesSchema,
    privacy: visibilitySchema,
  })
  .strict()
  .refine((v) => !v.completed || v.step === 3);
export const profileInputSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    bio: z.string().trim().max(280),
  })
  .strict();
export const accountSchema = z
  .object({
    uid: z.string().min(1).max(128),
    locale: z.enum(['de-DE', 'en-US']).optional(),
    avatarUrl: z.string().nullable().optional(),
    accountStatus: z
      .enum(['active', 'suspended', 'deletion_pending', 'deleted'])
      .optional(),
    onboardingStatus: z
      .enum(['not_started', 'in_progress', 'completed'])
      .optional(),
    displayName: z.string().max(80),
    bio: z.string().max(280),
    username: z.string(),
    onboarding: onboardingSchema,
    revision: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type Account = z.infer<typeof accountSchema>;
export type AccountOnboarding = z.infer<typeof onboardingSchema>;
export type ProfileInput = z.infer<typeof profileInputSchema>;
export const onboardingUpdateSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    onboarding: onboardingSchema,
  })
  .strict();
export const profileUpdateSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    profile: profileInputSchema,
  })
  .strict();
export function newOnboarding(): AccountOnboarding {
  return {
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
}

export const clientSettingsSchema = z
  .object({
    locale: z.enum(['de-DE', 'en-US']),
    privacy: visibilitySchema,
    duration: z.enum(['short', 'medium', 'long', 'extended', 'varied']),
    circleVisibility: z.enum(['private', 'members']),
    notifications: z.boolean(),
    appearance: z.enum(['system', 'light']),
  })
  .strict();
