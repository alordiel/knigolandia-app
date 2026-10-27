/** "1,4 MB" — Bulgarian decimal comma, one decimal above 1 MB. */
export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** Bulgarian count + noun: 1 ревю / 5 ревюта. */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
