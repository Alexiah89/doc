import { useCallback } from 'react';
import { useRepositories } from '../app/providers/RepositoryProvider';
import { useResource } from './useResource';
export function useCatalog() {
  const repos = useRepositories();
  const load = useCallback(async () => {
    const [
      programs,
      library,
      profile,
      circles,
      posts,
      users,
      reviews,
      overview,
    ] = await Promise.all([
      repos.programs.getPrograms(),
      repos.library.getLibrary(),
      repos.profile.getProfile(),
      repos.circles.getCircles(),
      repos.circles.getPosts(),
      repos.profile.getUsers(),
      repos.profile.getReviews(),
      repos.library.getOverview(),
    ]);
    const sessions = await repos.programs.getSessions(overview.mainProgramId);
    return {
      programs,
      library,
      profile,
      circles,
      posts,
      users,
      reviews,
      sessions,
      overview,
    };
  }, [repos]);
  return useResource(load);
}
