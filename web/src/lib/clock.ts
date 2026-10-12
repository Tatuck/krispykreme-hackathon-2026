import { getSetting, setSetting } from "./settings";

export const DAY = 24 * 60 * 60 * 1000;

// Demo "time travel": admin can push the app clock forward to show
// win-back and birthday automations without waiting weeks.
export async function getClockOffsetDays(): Promise<number> {
  return getSetting<number>("clockOffsetDays", 0);
}

export async function setClockOffsetDays(days: number) {
  await setSetting("clockOffsetDays", Math.max(0, Math.round(days)));
}

export async function now(): Promise<number> {
  return Date.now() + (await getClockOffsetDays()) * DAY;
}
