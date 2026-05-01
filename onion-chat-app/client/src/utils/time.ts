export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function clampTtlSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return 420;
  }

  return Math.max(300, Math.min(600, Math.floor(value)));
}
