export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
