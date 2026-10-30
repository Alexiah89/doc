import type { Timestamp } from 'firebase-admin/firestore';
import type {
  AccountStatus,
  OnboardingDraft,
  UserPreferences,
  ProfileVisibility,
} from '../../../shared/users.js';
export interface UserDocument {
  userId: string;
  authProvider: 'google';
  role: 'user' | 'moderator' | 'admin';
  accountStatus: AccountStatus;
  onboardingStatus: 'not_started' | 'in_progress' | 'completed';
  onboardingCurrentStep: number | null;
  onboardingDraft: OnboardingDraft | null;
  locale: 'de-DE' | 'en-US';
  timezone: string | null;
  preferences: UserPreferences;
  privacySettings: {
    profileVisibility: ProfileVisibility;
    progressVisibility: 'private';
    notes: 'private';
  };
  annualSessionGoal: number | null;
  revision: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  lastActiveAt: Timestamp;
}
export interface UserProfileDocument {
  userId: string;
  username: string;
  normalizedUsername: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  interests: UserPreferences['activityTypes'];
  profileVisibility: ProfileVisibility;
  followerCount: number;
  followingCount: number;
  circleCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export interface UsernameReservation {
  userId: string;
  createdAt: Timestamp;
}
export interface AuditLog {
  eventType:
    'user_created' | 'onboarding_completed' | 'profile_visibility_changed';
  actorUserId: string;
  targetUserId: string;
  environment: string;
  appVersion: string;
  createdAt: Timestamp;
  metadata: Record<string, unknown>;
}
