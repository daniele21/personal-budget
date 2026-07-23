export function formatBackupDate(createdAt: string | null): string {
  if (!createdAt) return 'Data non disponibile';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return 'Data non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
