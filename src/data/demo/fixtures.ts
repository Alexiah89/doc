import type {
  TrainingOverview,
  Circle,
  CircleMember,
  CirclePost,
  Program,
  ProgramCreator,
  ProgramRun,
  ProgramSession,
  Review,
  User,
  UserProfile,
  UserProgram,
} from '../models';
export const creators: ProgramCreator[] = [
  'Flow Studio',
  'Mira Moves',
  'Calm Motion',
  'Daily Balance',
].map((name, i) => ({ id: `creator-${i}`, name }));
const titles = [
  'Inner Awakening',
  'Stärke aus deiner Mitte',
  'Mehr Raum für Bewegung',
  'Zeit zum Loslassen',
  'Morning Flow',
  'Pilates Foundations',
  'Everyday Mobility',
  'Evening Stretch',
];
export const programs: Program[] = titles.map((title, i) => ({
  id: `demo-program-${i}`,
  youtubePlaylistId: `demo-playlist-${i}`,
  title,
  creator: creators[i % 4],
  thumbnailUrl: '/demo-cover.svg',
  activityType: (['Yoga', 'Pilates', 'Mobility', 'Stretching'] as const)[i % 4],
  language: 'de-DE',
  difficulty: i % 3 === 0 ? 'intermediate' : 'beginner',
  sessionCount: i === 0 ? 30 : 7 + i,
  averageDurationMinutes: [20, 25, 15, 12, 18, 28, 10, 16][i],
  totalDurationMinutes:
    (i === 0 ? 30 : 7 + i) * [20, 25, 15, 12, 18, 28, 10, 16][i],
  rating: 4 + (i % 5) * 0.2,
  reviewCount: 12 + i * 7,
  status: 'available',
  addedAt: `2026-10-${String(10 + i).padStart(2, '0')}`,
}));
export const users: User[] = ['Alex', 'Mira', 'Sam', 'Jo', 'Kim', 'Robin'].map(
  (displayName, i) => ({
    id: `demo-user-${i}`,
    displayName,
    username: `demo_${displayName.toLowerCase()}`,
  }),
);
export const profile: UserProfile = {
  ...users[0],
  bio: 'Ein Moment für Bewegung. Ein Moment für mich.',
  interests: ['Yoga', 'Mobility'],
  followers: 12,
  following: 8,
  annualGoal: 100,
  sessionsThisYear: 24,
  minutesThisYear: 480,
  privacy: { profile: 'private', progress: 'private', notes: 'private' },
};
export const library: UserProgram[] = programs.slice(0, 7).map((p, i) => ({
  programId: p.id,
  status: (
    [
      'active',
      'saved',
      'paused',
      'completed',
      'active',
      'saved',
      'paused',
    ] as const
  )[i],
  favorite: i === 0 || i === 3,
  progress: {
    completedSessions: i === 0 ? 8 : i === 3 ? p.sessionCount : i === 4 ? 3 : 0,
    trackableSessions: p.sessionCount,
    percent: i === 0 ? 27 : i === 3 ? 100 : i === 4 ? 27 : 0,
  },
  savedAt: p.addedAt,
}));
export const sessions: ProgramSession[] = Array.from(
  { length: 30 },
  (_, i) => ({
    id: `demo-session-${i}`,
    programId: programs[0].id,
    title: `Inner Awakening · ${i + 1}`,
    position: i + 1,
    durationMinutes: 20,
    availability: 'available',
  }),
);
export const runs: ProgramRun[] = library
  .filter((p) => p.status !== 'saved')
  .map((p, i) => ({
    id: `demo-run-${i}`,
    userId: users[0].id,
    programId: p.programId,
    programVersionId: 'demo-version-1',
    status: p.status === 'saved' ? 'active' : p.status,
    progress: p.progress,
  }));
export const reviews: Review[] = [
  {
    id: 'demo-review-0',
    userId: users[0].id,
    programId: programs[3].id,
    stars: 5,
    text: 'Eine ruhige Routine zum Ausklang des Tages.',
    visibility: 'public',
    completedAtReview: programs[3].sessionCount,
  },
  {
    id: 'demo-review-1',
    userId: users[1].id,
    programId: programs[0].id,
    stars: 4,
    text: 'Die klaren Anleitungen helfen mir, in meinem Tempo zu üben.',
    visibility: 'public',
    completedAtReview: 8,
  },
];
export const circles: Circle[] = programs.slice(0, 4).map((p, i) => ({
  id: `demo-circle-${i}`,
  programId: p.id,
  title: `${p.title} Circle`,
  memberCount: 28 + i * 13,
  similarMemberIds: i === 0 ? [users[1].id, users[2].id] : [users[3].id],
}));
export const members: CircleMember[] = circles.map((c) => ({
  circleId: c.id,
  userId: users[0].id,
  progressVisibility: 'private',
  showSimilarProgress: false,
}));
export const posts: CirclePost[] = circles.flatMap((c, i) => [
  {
    id: `demo-question-${i}`,
    circleId: c.id,
    userId: users[1].id,
    type: 'question' as const,
    text: 'Wie findet ihr einen ruhigen Moment für eure Routine?',
  },
  {
    id: `demo-progress-${i}`,
    circleId: c.id,
    userId: users[0].id,
    type: 'progress' as const,
    text: 'Ein Viertel meines Programms geschafft – in meinem eigenen Tempo.',
  },
]);

export const overview: TrainingOverview = {
  mainProgramId: programs[0].id,
  nextSessionPosition: 8,
  weeklySessionCounts: [1, 0, 1, 0, 0, 0, 0],
  weeklyMinutes: 40,
};
