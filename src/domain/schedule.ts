import type { ProgramInput } from "./program";

export type ScheduleDates = Pick<
  ProgramInput,
  "plannedStartDate" | "plannedEndDate" | "transferDate"
>;
export interface ScheduleGeometry {
  days: number;
  unscheduled: boolean;
  bar: { x: number; width: number } | null;
  marker: { x: number } | null;
}

export function getMonth(today: Date): string {
  return `${String(today.getFullYear()).padStart(4, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(month: string): [number, number] {
  if (!/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new RangeError("Invalid month");
  return [Number(month.slice(0, 4)), Number(month.slice(5))];
}

export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = parseMonth(month);
  const total = year * 12 + monthNumber - 1 + offset;
  const nextYear = Math.floor(total / 12);
  if (!Number.isInteger(offset) || nextYear < 1 || nextYear > 9999)
    throw new RangeError("Invalid month offset");
  return `${String(nextYear).padStart(4, "0")}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function getScheduleGeometry(
  dates: Readonly<ScheduleDates>,
  month: string,
): ScheduleGeometry {
  const [year, monthNumber] = parseMonth(month);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = monthNumber === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(monthNumber) ? 30 : 31;
  const first = `${month}-01`;
  const last = `${month}-${days}`;
  const { plannedStartDate, plannedEndDate, transferDate } = dates;
  const unscheduled = plannedStartDate === null || plannedEndDate === null;
  let bar: ScheduleGeometry["bar"] = null;
  if (plannedStartDate && plannedEndDate && plannedStartDate <= last && plannedEndDate >= first) {
    const start = plannedStartDate < first ? 1 : Number(plannedStartDate.slice(8));
    const end = plannedEndDate > last ? days : Number(plannedEndDate.slice(8));
    bar = { x: start - 1, width: end - start + 1 };
  }
  const marker =
    transferDate && transferDate >= first && transferDate <= last
      ? { x: Number(transferDate.slice(8)) - 0.5 }
      : null;
  return { days, unscheduled, bar, marker };
}
