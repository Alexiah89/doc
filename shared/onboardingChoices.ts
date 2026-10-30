// Stable UI aliases retained for existing saved demo data; shared/users.ts maps
// these typed choices to the persisted Sprint-2 domain values.
export const activityChoices = [
  'Yoga',
  'Pilates',
  'Mobility',
  'Stretching',
] as const;
export const durationChoices = [
  'short',
  'medium',
  'long',
  'extended',
  'varied',
] as const;
export const frequencyChoices = [
  'light',
  'regular',
  'often',
  'daily',
  'flexible',
] as const;
export const focusChoices = [
  'flexibility',
  'relaxation',
  'back',
  'strength',
  'morning',
  'evening',
  'restart',
  'consistency',
] as const;
export const privacyChoices = ['private', 'followers', 'public'] as const;
