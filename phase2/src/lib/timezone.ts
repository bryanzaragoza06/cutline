// Pacific wall-clock helpers (handles PST/PDT).
const TIME_ZONE = "America/Los_Angeles";

function pacificWallClockParts(date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) if (part.type !== "literal") parts[part.type] = part.value;
  return {
    year: +parts.year,
    month: +parts.month,
    day: +parts.day,
    hour: +parts.hour,
    minute: +parts.minute,
    second: +parts.second,
  };
}

/** UTC-minus-Pacific offset (ms) at the given instant. */
function pacificOffsetMs(date: Date): number {
  const p = pacificWallClockParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
}

/** UTC instant for today's (Pacific, as of `reference`) occurrence of the given Pacific hour/minute. */
export function pacificTimeOfDayToUtc(hour: number, minute: number, reference: Date): Date {
  const today = pacificWallClockParts(reference);
  const naiveGuess = Date.UTC(today.year, today.month - 1, today.day, hour, minute, 0);
  const offset1 = pacificOffsetMs(new Date(naiveGuess));
  const offset2 = pacificOffsetMs(new Date(naiveGuess - offset1));
  return new Date(naiveGuess - offset2);
}

/** Next occurrence (today if still upcoming, else tomorrow) — like an alarm clock. */
export function nextPacificTimeOfDay(hour: number, minute: number, now: Date): Date {
  const todayOccurrence = pacificTimeOfDayToUtc(hour, minute, now);
  if (todayOccurrence > now) return todayOccurrence;
  const tomorrowReference = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return pacificTimeOfDayToUtc(hour, minute, tomorrowReference);
}
