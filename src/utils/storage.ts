const prefix = 'flowcircle.demo.v1.';
export function readStored<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T {
  try {
    const raw = localStorage.getItem(prefix + key);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function writeStored(key: string, value: unknown): void {
  localStorage.setItem(prefix + key, JSON.stringify(value));
}
