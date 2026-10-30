import type {
  TrainingOverview,
  Circle,
  CirclePost,
  DemoSettings,
  OnboardingState,
  Program,
  ProgramSession,
  Review,
  User,
  AuthUser,
  UserProfile,
  UserProgram,
} from '../models';
export interface AuthRepository {
  getCurrentUser(): Promise<AuthUser | null>;
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
  subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void;
  startDemo(): Promise<User>;
}
export interface ProgramRepository {
  getPrograms(): Promise<Program[]>;
  getSessions(programId: string): Promise<ProgramSession[]>;
}
export interface LibraryRepository {
  getOverview(): Promise<TrainingOverview>;
  getLibrary(): Promise<UserProgram[]>;
  toggleSaved(programId: string): Promise<UserProgram[]>;
}
export interface ProfileRepository {
  getProfile(): Promise<UserProfile>;
  getUsers(): Promise<User[]>;
  getReviews(): Promise<Review[]>;
}
export interface CircleRepository {
  getCircles(): Promise<Circle[]>;
  getPosts(): Promise<CirclePost[]>;
}
export interface SettingsRepository {
  getSettings(): DemoSettings;
  saveSettings(settings: DemoSettings): void;
  getOnboarding(): OnboardingState;
  saveOnboarding(state: OnboardingState): void | Promise<void>;
}
export interface Repositories {
  auth: AuthRepository;
  programs: ProgramRepository;
  library: LibraryRepository;
  profile: ProfileRepository;
  circles: CircleRepository;
  settings: SettingsRepository;
}
