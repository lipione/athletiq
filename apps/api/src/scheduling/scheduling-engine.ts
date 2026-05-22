export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  Date.parse(aStart) < Date.parse(bEnd) && Date.parse(bStart) < Date.parse(aEnd);

export const addMinutes = (iso: string, minutes: number) =>
  new Date(Date.parse(iso) + minutes * 60_000).toISOString();

export const minutesBetween = (firstEnd: string, secondStart: string) =>
  (Date.parse(secondStart) - Date.parse(firstEnd)) / 60_000;
