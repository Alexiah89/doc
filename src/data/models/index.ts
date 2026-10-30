export type ActivityType = 'Yoga' | 'Pilates' | 'Mobility' | 'Stretching';
export type Difficulty = 'beginner' | 'intermediate';
export type ProgramStatus = 'available' | 'unavailable';
export type Visibility = 'private' | 'followers' | 'public';
export interface User {
  id: string;
  displayName: string;
  username: string;
}
export interface PrivacySettings {
  profile: Visibility;
  progress: Visibility;
  notes: 'private';
}
export interface UserPreferences {
  activities: ActivityType[];
  duration: string;
  frequency: string;
  priorities: string[];
}
export interface UserProfile extends User {
  bio: string;
  interests: ActivityType[];
  followers: number;
  following: number;
  annualGoal: number;
  sessionsThisYear: number;
  minutesThisYear: number;
  privacy: PrivacySettings;
}
export interface ProgramCreator {
  id: string;
  name: string;
}
export interface Program {
  id: string;
  youtubePlaylistId: string;
  title: string;
  creator: ProgramCreator;
  thumbnailUrl: string;
  activityType: ActivityType;
  language: string;
  difficulty: Difficulty;
  sessionCount: number;
  averageDurationMinutes: number;
  totalDurationMinutes: number;
  rating: number | null;
  reviewCount: number;
  status: ProgramStatus;
  addedAt: string;
}
export interface ProgramSession {
  id: string;
  programId: string;
  title: string;
  position: number;
  durationMinutes: number;
  availability: 'available' | 'unavailable';
}
export interface ProgramProgress {
  completedSessions: number;
  trackableSessions: number;
  percent: number;
}
export type LibraryStatus = 'active' | 'saved' | 'paused' | 'completed';
export interface UserProgram {
  programId: string;
  status: LibraryStatus;
  favorite: boolean;
  progress: ProgramProgress;
  savedAt: string;
}
export interface ProgramRun {
  id: string;
  userId: string;
  programId: string;
  programVersionId: string;
  status: 'active' | 'paused' | 'completed';
  progress: ProgramProgress;
}
export interface Review {
  id: string;
  userId: string;
  programId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  text: string;
  visibility: 'public' | 'private';
  completedAtReview: number;
}
export interface Circle {
  id: string;
  programId: string;
  title: string;
  memberCount: number;
  similarMemberIds: string[];
}
export interface CircleMember {
  circleId: string;
  userId: string;
  progressVisibility: Visibility | 'members';
  showSimilarProgress: boolean;
}
export interface CirclePost {
  id: string;
  circleId: string;
  userId: string;
  type: 'question' | 'experience' | 'progress';
  text: string;
}
export interface Notification {
  id: string;
  userId: string;
  messageKey: string;
  read: boolean;
}
export interface ApiError {
  code: string;
  userMessageKey: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}
export type Locale = 'de-DE' | 'en-US';
export interface DemoSettings {
  locale: Locale;
  privacy: Visibility;
  duration: string;
  circleVisibility: 'private' | 'members';
  notifications: boolean;
  appearance: 'system' | 'light';
}
export interface OnboardingState {
  step: number;
  completed: boolean;
  preferences: UserPreferences;
  privacy: Visibility;
}

export interface TrainingOverview {
  mainProgramId: string;
  nextSessionPosition: number;
  weeklySessionCounts: number[];
  weeklyMinutes: number;
}

export interface AuthUser {
  uid: string;
  displayName: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
}
