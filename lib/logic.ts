// Pure functions with no imports, so they can be unit tested directly with `node --test`.

// ---------- Ordering of steps into modules ----------

export type Positioned = { id: string; module: string; position: number };
export type ModuleGroup<T> = { module: string; items: T[] };

/** Groups steps by module, modules in order of their first step, steps by position. */
export function groupByModule<T extends Positioned>(items: T[]): ModuleGroup<T>[] {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const groups: ModuleGroup<T>[] = [];
  for (const item of sorted) {
    let group = groups.find((g) => g.module === item.module);
    if (!group) {
      group = { module: item.module, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/** The ids in display order; writing these back as positions 0..n keeps modules contiguous. */
export function displayOrder(items: Positioned[]): string[] {
  return groupByModule(items).flatMap((g) => g.items.map((i) => i.id));
}

/** Moves a step one place up or down within its module. */
export function moveStep(items: Positioned[], id: string, direction: 'up' | 'down'): string[] {
  const groups = groupByModule(items);
  for (const group of groups) {
    const from = group.items.findIndex((i) => i.id === id);
    if (from < 0) continue;
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to >= 0 && to < group.items.length) {
      [group.items[from], group.items[to]] = [group.items[to], group.items[from]];
    }
  }
  return groups.flatMap((g) => g.items.map((i) => i.id));
}

/** Moves a whole module one place up or down. */
export function moveModule(items: Positioned[], module: string, direction: 'up' | 'down'): string[] {
  const groups = groupByModule(items);
  const from = groups.findIndex((g) => g.module === module);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from >= 0 && to >= 0 && to < groups.length) {
    [groups[from], groups[to]] = [groups[to], groups[from]];
  }
  return groups.flatMap((g) => g.items.map((i) => i.id));
}

/**
 * Changes whenever a step's saved content changes. Used as the key of its edit form so the form is rebuilt
 * after every save and never shows, or re-saves, stale values.
 */
export function stepVersion(step: {
  module: string;
  title: string;
  explanation: string;
  links: unknown;
  contact: string;
  doneWhen: string;
  contactRole: string | null;
  week: number | null;
  dueDate?: Date | null;
}): string {
  return JSON.stringify([
    step.module, step.title, step.explanation, step.links, step.contact, step.contactRole, step.doneWhen, step.week, step.dueDate ?? null,
  ]);
}

// ---------- Contacts ----------

export type Person = { id: string; name: string };
export type ResolvedContact = { text: string; person: Person | null; role: 'manager' | 'buddy' | null };

/** The person a contact text starts with ("Eva Eigenberg (HR)" → Eva), longest name first so "Jan de Vries" beats "Jan". */
export function findPerson(text: string, people: Person[]): Person | null {
  const lower = text.toLowerCase();
  const matches = people.filter((p) => {
    const name = p.name.toLowerCase();
    return name && lower.startsWith(name) && !/[\p{L}\p{N}]/u.test(lower.charAt(name.length));
  });
  return matches.sort((a, b) => b.name.length - a.name.length)[0] ?? null;
}

/**
 * What a step's contact shows for one plan: the plan's manager or buddy for a contact role
 * (or a generic "Your manager" while none is set), otherwise the free text, linked to Who is who when it names someone there.
 */
export function resolveContact(
  step: { contact: string; contactRole: string | null },
  plan: { manager: Person | null; buddy: Person | null },
  people: Person[],
): ResolvedContact | null {
  if (step.contactRole === 'MANAGER') return { text: plan.manager?.name ?? 'Your manager', person: plan.manager, role: 'manager' };
  if (step.contactRole === 'BUDDY') return { text: plan.buddy?.name ?? 'Your buddy', person: plan.buddy, role: 'buddy' };
  if (!step.contact) return null;
  return { text: step.contact, person: findPerson(step.contact, people), role: null };
}

/** How a contact reads on a template, where there is no plan yet. */
export function templateContact(step: { contact: string; contactRole: string | null }): string {
  if (step.contactRole === 'MANAGER') return "The new hire's manager";
  if (step.contactRole === 'BUDDY') return "The new hire's buddy";
  return step.contact;
}

// ---------- Links ----------

export type Link = { label: string; url: string };

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Parses one link per line, written as "Label | https://..." or just a URL. Throws on a bad URL. */
export function parseLinks(text: string): Link[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.lastIndexOf('|');
      const label = separator >= 0 ? line.slice(0, separator).trim() : '';
      const url = (separator >= 0 ? line.slice(separator + 1) : line).trim();
      if (!isSafeUrl(url)) throw new Error(`Not a valid http(s) link: ${url}`);
      return { label: label || url, url };
    });
}

export function formatLinks(links: Link[]): string {
  return links.map((l) => `${l.label} | ${l.url}`).join('\n');
}

/** Reads links from a JSON column, dropping anything malformed or unsafe. */
export function toLinks(value: unknown): Link[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is Link =>
      !!v && typeof v === 'object' && typeof v.label === 'string' && typeof v.url === 'string' && isSafeUrl(v.url),
  );
}

// ---------- Dates (all stored as UTC midnight) ----------

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-05" → Date at UTC midnight. Returns null for anything else. */
export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Date-only values are stored at UTC midnight, so they format in UTC; pass a time zone for real timestamps. */
export function formatDate(date: Date, timeZone = 'UTC'): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone });
}

/** Today's calendar date ("2026-10-05") in the given time zone. */
export function todayInput(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export type GoalTiming = { targetDate: Date | null; withinWeeks: number | null };

/** A fixed target date wins; otherwise "within N weeks" counts from the plan's start date. */
export function goalDueDate(goal: GoalTiming, startDate: Date): Date | null {
  if (goal.targetDate) return goal.targetDate;
  if (goal.withinWeeks != null) return new Date(startDate.getTime() + goal.withinWeeks * 7 * DAY_MS);
  return null;
}

/** Overdue once the due date is before today in the team's time zone; a goal due today is not overdue. */
export function isOverdue(due: Date | null, now: Date, timeZone = 'UTC'): boolean {
  return !!due && toDateInput(due) < todayInput(now, timeZone);
}

// ---------- Step timing ----------

export type StepTiming = { week: number | null; dueDate: Date | null };

/** First and last day of onboarding week N (week 1 starts on the start date). */
export function weekRange(startDate: Date, week: number): { from: Date; to: Date } {
  const from = new Date(startDate.getTime() + (week - 1) * 7 * DAY_MS);
  return { from, to: new Date(from.getTime() + 6 * DAY_MS) };
}

/** The week of onboarding a date falls in; 0 or less before the start date. */
export function weekOf(date: Date, startDate: Date): number {
  return Math.floor((date.getTime() - startDate.getTime()) / (7 * DAY_MS)) + 1;
}

/** Today's week of onboarding in the given time zone. */
export function currentWeek(startDate: Date, now: Date, timeZone = 'UTC'): number {
  return weekOf(parseDateInput(todayInput(now, timeZone))!, startDate);
}

/** A fixed date wins; otherwise the last day of the step's week. */
export function stepDueDate(step: StepTiming, startDate: Date): Date | null {
  if (step.dueDate) return step.dueDate;
  if (step.week != null) return weekRange(startDate, step.week).to;
  return null;
}

/** The week a step is planned in: its own week, or the week its fixed date falls in. */
export function stepWeek(step: StepTiming, startDate: Date): number | null {
  if (step.dueDate) return weekOf(step.dueDate, startDate);
  return step.week;
}

/** Short label such as "Week 2 · 9–15 Nov" or "On 3 Nov", or null for a step without timing. */
export function stepTimingLabel(step: StepTiming, startDate: Date): string | null {
  const short = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  if (step.dueDate) return `On ${short(step.dueDate)}`;
  if (step.week == null) return null;
  const { from, to } = weekRange(startDate, step.week);
  const sameMonth = from.getUTCMonth() === to.getUTCMonth();
  return `Week ${step.week} · ${sameMonth ? from.getUTCDate() : short(from)}–${short(to)}`;
}

/** Steps by due date, earliest first; steps without timing keep their plan order, after the dated ones. */
export function byDueDate<T extends StepTiming>(steps: T[], startDate: Date): T[] {
  const time = (s: T) => stepDueDate(s, startDate)?.getTime() ?? Infinity;
  return steps.map((step, index) => ({ step, index })).sort((a, b) => time(a.step) - time(b.step) || a.index - b.index).map((x) => x.step);
}

/** The step to do next: the open step that is due first, or the first open step when none has timing. */
export function nextStep<T extends StepTiming & { status: string; removed: boolean }>(steps: T[], startDate: Date): T | undefined {
  return byDueDate(steps, startDate).find((s) => !s.removed && s.status !== 'DONE');
}

/**
 * What a new hire should look at now: open steps planned for this week, plus open steps that are overdue.
 * Before the start date it shows week 1.
 */
export function thisWeekSteps<T extends StepTiming & { status: string; removed: boolean }>(
  steps: T[],
  startDate: Date,
  now: Date,
  timeZone = 'UTC',
): { week: number; due: T[]; overdue: T[] } {
  const week = Math.max(1, currentWeek(startDate, now, timeZone));
  const open = byDueDate(steps, startDate).filter((s) => !s.removed && s.status !== 'DONE');
  const overdue = open.filter((s) => isOverdue(stepDueDate(s, startDate), now, timeZone));
  const due = open.filter((s) => !overdue.includes(s) && stepWeek(s, startDate) === week);
  return { week, due, overdue };
}

// ---------- Progress ----------

export type StatsInput = {
  startDate: Date;
  steps: (StepTiming & { status: string; removed: boolean })[];
  goals: (GoalTiming & { status: string; removed: boolean })[];
};

export function planStats(plan: StatsInput, now: Date = new Date(), timeZone = 'UTC') {
  const steps = plan.steps.filter((s) => !s.removed);
  const goals = plan.goals.filter((g) => !g.removed);
  const doneSteps = steps.filter((s) => s.status === 'DONE').length;
  const blockedSteps = steps.filter((s) => s.status === 'BLOCKED').length;
  const overdueSteps = steps.filter(
    (s) => s.status !== 'DONE' && isOverdue(stepDueDate(s, plan.startDate), now, timeZone),
  ).length;
  const doneGoals = goals.filter((g) => g.status === 'DONE').length;
  const overdueGoals = goals.filter(
    (g) => g.status !== 'DONE' && isOverdue(goalDueDate(g, plan.startDate), now, timeZone),
  ).length;
  const total = steps.length + goals.length;
  const done = doneSteps + doneGoals;
  return {
    totalSteps: steps.length,
    doneSteps,
    blockedSteps,
    overdueSteps,
    totalGoals: goals.length,
    doneGoals,
    overdueGoals,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}
