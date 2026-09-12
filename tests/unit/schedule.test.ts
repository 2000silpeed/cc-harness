import { expect, it } from "vitest";
import {
  getMonth,
  shiftMonth,
  getScheduleGeometry,
  type ScheduleDates,
} from "../../src/domain/schedule";

const dates: ScheduleDates = {
  plannedStartDate: "2026-09-10",
  plannedEndDate: "2026-09-12",
  transferDate: "2026-09-30",
};

it("M01 AC3 should use the local calendar month when today is injected", () => {
  expect(getMonth(new Date(2026, 8, 1, 0, 0))).toBe("2026-09");
});

it.each([
  ["2026-12", 1, "2027-01"],
  ["2026-01", -1, "2025-12"],
  ["2026-09", 0, "2026-09"],
] as const)(
  "M02 AC3 should move %s by %s when crossing month boundaries",
  (month, offset, expected) => {
    expect(shiftMonth(month, offset)).toBe(expected);
  },
);

it.each([
  ["2028-02", 29],
  ["2027-02", 28],
  ["2100-02", 28],
  ["2000-02", 29],
  ["2026-04", 30],
  ["2026-12", 31],
] as const)("M03 AC1 should use %s calendar days when building the axis", (month, days) => {
  expect(getScheduleGeometry(dates, month).days).toBe(days);
});

it("S01 AC1 should include both endpoints when a planned interval is visible", () => {
  expect(getScheduleGeometry(dates, "2026-09")).toEqual({
    days: 30,
    unscheduled: false,
    bar: { x: 9, width: 3 },
    marker: { x: 29.5 },
  });
});

it.each([1, 30])("S02 AC1 should draw one day when both dates are September %s", (day) => {
  const date = `2026-09-${String(day).padStart(2, "0")}`;
  expect(
    getScheduleGeometry({ ...dates, plannedStartDate: date, plannedEndDate: date }, "2026-09").bar,
  ).toEqual({ x: day - 1, width: 1 });
});

it.each([
  ["2026-08-31", "2026-09-02", { x: 0, width: 2 }],
  ["2026-09-29", "2026-10-01", { x: 28, width: 2 }],
  ["2026-08-31", "2026-10-01", { x: 0, width: 30 }],
  ["2026-08-01", "2026-08-31", null],
  ["2026-10-01", "2026-10-02", null],
])("S03 AC1 should clip or omit when interval is %s to %s", (start, end, bar) => {
  expect(
    getScheduleGeometry(
      { ...dates, plannedStartDate: start as string, plannedEndDate: end as string },
      "2026-09",
    ),
  ).toEqual({ days: 30, unscheduled: false, bar, marker: { x: 29.5 } });
});

it.each([
  [null, "2026-09-12"],
  ["2026-09-10", null],
  [null, null],
])(
  "S04 AC2 should retain only transfer when a planned endpoint is missing (%s, %s)",
  (start, end) => {
    expect(
      getScheduleGeometry({ ...dates, plannedStartDate: start, plannedEndDate: end }, "2026-09"),
    ).toEqual({ days: 30, unscheduled: true, bar: null, marker: { x: 29.5 } });
  },
);

it.each([
  ["2026-09-01", { x: 0.5 }],
  ["2026-09-30", { x: 29.5 }],
  ["2026-08-31", null],
  ["2026-10-01", null],
  [null, null],
])("S05 AC2 should position or omit transfer when date is %s", (transferDate, marker) => {
  expect(
    getScheduleGeometry({ ...dates, transferDate: transferDate as string | null }, "2026-09"),
  ).toEqual({ days: 30, unscheduled: false, bar: { x: 9, width: 3 }, marker });
});

it("S06 AC2 should leave an empty schedule when all dates are missing", () => {
  expect(
    getScheduleGeometry(
      { plannedStartDate: null, plannedEndDate: null, transferDate: null },
      "2026-09",
    ),
  ).toEqual({ days: 30, unscheduled: true, bar: null, marker: null });
});

it("S07 AC3 should preserve input and ignore actual completion when the month changes", () => {
  const record = Object.freeze({ ...dates, actualCompletionDate: "2026-09-01", status: "開発" });
  const before = { ...record };
  expect(getScheduleGeometry(record, "2026-09").bar).toEqual({ x: 9, width: 3 });
  expect(getScheduleGeometry(record, "2026-10").bar).toBeNull();
  expect(record).toEqual(before);
});

it.each(["2026-00", "2026-13", "2026-9", "invalid"])(
  "M04 AC3 should reject malformed month when given %s",
  (month) => {
    expect(() => shiftMonth(month, 1)).toThrow(RangeError);
    expect(() => getScheduleGeometry(dates, month)).toThrow(RangeError);
  },
);
