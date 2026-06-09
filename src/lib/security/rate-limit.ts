type RateWindow = {
  count: number;
  startTime: number;
};

const windows = new Map<string, RateWindow>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || now - existing.startTime > windowMs) {
    windows.set(key, { count: 1, startTime: now });
    return false;
  }

  existing.count += 1;
  windows.set(key, existing);

  return existing.count > limit;
}
