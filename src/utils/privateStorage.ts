export function clearPrivateStorage(uid: string | undefined) {
  if (!uid) return;
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[name];
      storage.removeItem(`flowcircle.demo.v1.account.${uid}.settings`);
      storage.removeItem(`flowcircle.account.${uid}`);
    } catch {
      /* Privacy cleanup must also work with unavailable browser storage. */
    }
  }
}
