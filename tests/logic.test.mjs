// Runs with Node's built-in test runner; Node 22.18+ strips the TypeScript types itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  displayOrder,
  findPerson,
  goalDueDate,
  groupByModule,
  isOverdue,
  moveModule,
  moveStep,
  nextStep,
  parseDateInput,
  parseLinks,
  planStats,
  resolveContact,
  stepDueDate,
  stepTimingLabel,
  thisWeekSteps,
  toLinks,
  todayInput,
  weekOf,
  groupByPhase,
  currentPhase,
  stepPhase,
  templateTimingLabel,
} from '../lib/logic.ts';

const steps = [
  { id: 'a', module: 'Day 1', position: 0 },
  { id: 'b', module: 'Day 1', position: 1 },
  { id: 'c', module: 'Week 1', position: 2 },
  { id: 'd', module: 'Week 1', position: 3 },
];

test('groups steps by module in order of first appearance', () => {
  const shuffled = [steps[3], steps[0], steps[2], steps[1]];
  assert.deepEqual(
    groupByModule(shuffled).map((g) => [g.module, g.items.map((i) => i.id)]),
    [['Day 1', ['a', 'b']], ['Week 1', ['c', 'd']]],
  );
});

test('a step appended to an existing module is shown at the end of that module', () => {
  const withNew = [...steps, { id: 'e', module: 'Day 1', position: 4 }];
  assert.deepEqual(displayOrder(withNew), ['a', 'b', 'e', 'c', 'd']);
});

test('moves a step within its module but not across modules', () => {
  assert.deepEqual(moveStep(steps, 'b', 'up'), ['b', 'a', 'c', 'd']);
  assert.deepEqual(moveStep(steps, 'b', 'down'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(moveStep(steps, 'a', 'up'), ['a', 'b', 'c', 'd']);
});

test('moves a whole module', () => {
  assert.deepEqual(moveModule(steps, 'Week 1', 'up'), ['c', 'd', 'a', 'b']);
  assert.deepEqual(moveModule(steps, 'Week 1', 'down'), ['a', 'b', 'c', 'd']);
});

test('parses links and rejects unsafe ones', () => {
  assert.deepEqual(parseLinks('Confluence | https://example.com/page\nhttps://example.com/x\n\n'), [
    { label: 'Confluence', url: 'https://example.com/page' },
    { label: 'https://example.com/x', url: 'https://example.com/x' },
  ]);
  assert.throws(() => parseLinks('Bad | javascript:alert(1)'));
  assert.deepEqual(toLinks([{ label: 'x', url: 'javascript:alert(1)' }, { label: 'ok', url: 'https://a.b' }, 'junk']), [
    { label: 'ok', url: 'https://a.b' },
  ]);
});

test('goal due dates: fixed date wins, otherwise weeks from start', () => {
  const start = parseDateInput('2026-10-05');
  assert.equal(goalDueDate({ targetDate: parseDateInput('2026-11-01'), withinWeeks: 2 }, start).toISOString().slice(0, 10), '2026-11-01');
  assert.equal(goalDueDate({ targetDate: null, withinWeeks: 4 }, start).toISOString().slice(0, 10), '2026-11-02');
  assert.equal(goalDueDate({ targetDate: null, withinWeeks: null }, start), null);
  assert.equal(parseDateInput('05-10-2026'), null);
});

test('a goal due today is not overdue yet', () => {
  const now = new Date('2026-11-02T15:00:00Z');
  assert.equal(isOverdue(parseDateInput('2026-11-02'), now), false);
  assert.equal(isOverdue(parseDateInput('2026-11-01'), now), true);
  assert.equal(isOverdue(null, now), false);
});

test('"today" follows the team time zone, not the server clock', () => {
  // 00:45 in Amsterdam on 5 Oct is still 4 Oct in UTC.
  const now = new Date('2026-10-04T22:45:00Z');
  assert.equal(todayInput(now, 'Europe/Amsterdam'), '2026-10-05');
  assert.equal(todayInput(now, 'UTC'), '2026-10-04');
  assert.equal(isOverdue(parseDateInput('2026-10-04'), now, 'Europe/Amsterdam'), true);
  assert.equal(isOverdue(parseDateInput('2026-10-04'), now, 'UTC'), false);
});

const untimed = { week: null, dueDate: null };

test('plan stats ignore removed steps and goals, and count overdue open steps and goals', () => {
  const stats = planStats(
    {
      startDate: parseDateInput('2026-09-01'),
      steps: [
        { status: 'DONE', removed: false, week: 1, dueDate: null },
        { status: 'BLOCKED', removed: false, week: 2, dueDate: null },
        { status: 'OPEN', removed: false, ...untimed },
        { status: 'DONE', removed: true, ...untimed },
        { status: 'OPEN', removed: true, week: 1, dueDate: null },
      ],
      goals: [
        { status: 'OPEN', removed: false, targetDate: null, withinWeeks: 2 },
        { status: 'DONE', removed: false, targetDate: null, withinWeeks: 1 },
        { status: 'OPEN', removed: true, targetDate: null, withinWeeks: 1 },
      ],
    },
    new Date('2026-10-02T12:00:00Z'),
  );
  assert.equal(stats.totalSteps, 3);
  assert.equal(stats.doneSteps, 1);
  assert.equal(stats.blockedSteps, 1);
  assert.equal(stats.overdueSteps, 1, 'the blocked week-2 step; the done one and the removed one do not count');
  assert.equal(stats.totalGoals, 2);
  assert.equal(stats.overdueGoals, 1);
  assert.equal(stats.percent, 40);
});

test('step timing: a fixed date wins, otherwise the last day of the week', () => {
  const start = parseDateInput('2026-11-02'); // a Monday
  assert.equal(stepDueDate({ week: 1, dueDate: null }, start).toISOString().slice(0, 10), '2026-11-08');
  assert.equal(stepDueDate({ week: 2, dueDate: parseDateInput('2026-11-05') }, start).toISOString().slice(0, 10), '2026-11-05');
  assert.equal(stepDueDate(untimed, start), null);
  assert.equal(weekOf(parseDateInput('2026-11-08'), start), 1);
  assert.equal(weekOf(parseDateInput('2026-11-09'), start), 2);
  assert.equal(weekOf(parseDateInput('2026-10-30'), start), 0);
});

test('step timing labels', () => {
  const start = parseDateInput('2026-11-02');
  assert.equal(stepTimingLabel({ week: 1, dueDate: null }, start), 'Week 1 · 2–8 Nov');
  assert.equal(stepTimingLabel({ week: 5, dueDate: null }, start), 'Week 5 · 30 Nov–6 Dec');
  assert.equal(stepTimingLabel({ week: null, dueDate: parseDateInput('2026-11-03') }, start), 'On 3 Nov');
  assert.equal(stepTimingLabel(untimed, start), null);
});

test('this week: open steps of the current week, overdue ones separately, week 1 before the start', () => {
  const start = parseDateInput('2026-11-02');
  const step = (id, week, status = 'OPEN', extra = {}) => ({ id, week, dueDate: null, status, removed: false, ...extra });
  const steps = [
    step('w1', 1),
    step('w1done', 1, 'DONE'),
    step('w2', 2),
    step('w2blocked', 2, 'BLOCKED'),
    step('w2removed', 2, 'OPEN', { removed: true }),
    step('dated', null, 'OPEN', { dueDate: parseDateInput('2026-11-10') }),
    step('w3', 3),
    step('none', null),
  ];
  const ids = (list) => list.map((s) => s.id);

  const before = thisWeekSteps(steps, start, new Date('2026-10-28T12:00:00Z'));
  assert.equal(before.week, 1);
  assert.deepEqual(ids(before.due), ['w1']);
  assert.deepEqual(ids(before.overdue), []);

  const week2 = thisWeekSteps(steps, start, new Date('2026-11-11T12:00:00Z'));
  assert.equal(week2.week, 2);
  assert.deepEqual(ids(week2.overdue), ['w1', 'dated']);
  assert.deepEqual(ids(week2.due), ['w2', 'w2blocked']);
});

test("contacts: roles become the plan's people, names link to Who is who", () => {
  const eva = { id: 'e', name: 'Eva Eigenberg' };
  const jan = { id: 'j', name: 'Jan' };
  const janDeVries = { id: 'jdv', name: 'Jan de Vries' };
  const william = { id: 'w', name: 'William van de Hel' };
  const people = [eva, jan, janDeVries, william];
  const plan = { manager: william, buddy: null };

  assert.deepEqual(resolveContact({ contact: '', contactRole: 'MANAGER' }, plan, people), { text: 'William van de Hel', person: william, role: 'manager' });
  assert.deepEqual(resolveContact({ contact: 'ignored', contactRole: 'BUDDY' }, plan, people), { text: 'Your buddy', person: null, role: 'buddy' });
  assert.deepEqual(resolveContact({ contact: 'Eva Eigenberg (HR)', contactRole: null }, plan, people), { text: 'Eva Eigenberg (HR)', person: eva, role: null });
  assert.equal(resolveContact({ contact: '', contactRole: null }, plan, people), null);

  assert.equal(findPerson('Jan de Vries, backend', people), janDeVries, 'the longest matching name wins');
  assert.equal(findPerson('Jan', people), jan);
  assert.equal(findPerson('Janine', people), null, 'a name must end at a word boundary');
  assert.equal(findPerson('eva eigenberg', people), eva, 'case does not matter');
  assert.equal(findPerson('Je buddy', people), null);
});

test('next step and this week follow the dates, not the plan order', () => {
  const start = parseDateInput('2026-11-02');
  const step = (id, extra) => ({ id, week: null, dueDate: null, status: 'OPEN', removed: false, ...extra });
  const steps = [
    step('thursday', { dueDate: parseDateInput('2026-11-05') }),
    step('untimed'),
    step('week1', { week: 1 }),
    step('course', { dueDate: parseDateInput('2026-11-04') }),
    step('doneEarly', { dueDate: parseDateInput('2026-11-02'), status: 'DONE' }),
  ];
  assert.equal(nextStep(steps, start).id, 'course');
  assert.deepEqual(
    thisWeekSteps(steps, start, new Date('2026-11-02T09:00:00Z')).due.map((s) => s.id),
    ['course', 'thursday', 'week1'],
  );
  assert.equal(nextStep([step('a'), step('b')], start).id, 'a', 'without timing the plan order decides');
});

test('day 1 timing: week 0 is the start date itself', () => {
  const start = parseDateInput('2026-11-02');
  const day1 = { week: 0, dueDate: null };
  assert.equal(stepDueDate(day1, start).toISOString().slice(0, 10), '2026-11-02');
  assert.equal(stepTimingLabel(day1, start), 'Day 1 · 2 Nov');
  assert.equal(templateTimingLabel(day1), 'Day 1');
  assert.equal(templateTimingLabel({ week: 3 }), 'Week 3');
});

test('steps fall into time phases', () => {
  const start = parseDateInput('2026-11-02');
  const at = (w) => stepPhase({ week: w, dueDate: null }, start);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 8, 9, 13, 14, 26, null].map(at), [
    'day1', 'week1', 'week2', 'weeks3-4', 'weeks3-4', 'month2', 'month2', 'month3', 'month3', 'later', 'later', 'anytime',
  ]);
  assert.equal(stepPhase({ week: null, dueDate: parseDateInput('2026-11-02') }, start), 'day1');
  assert.equal(stepPhase({ week: null, dueDate: parseDateInput('2026-11-06') }, start), 'week1');
  assert.equal(stepPhase({ week: 1, dueDate: parseDateInput('2026-11-20') }, start), 'weeks3-4');
});

test('phases group and order steps, with dates for the start date', () => {
  const start = parseDateInput('2026-11-02');
  const s = (id, module, position, week, dueDate = null) => ({ id, module, position, week, dueDate: dueDate && parseDateInput(dueDate) });
  const groups = groupByPhase(
    [s('a', 'Tools', 0, 2), s('b', 'Dag 1', 1, 0), s('c', 'LEEF', 2, null), s('d', 'Tools', 3, 1), s('e', 'HR', 4, null, '2026-11-03'), s('f', 'LEEF', 5, 6)],
    start,
  );
  assert.deepEqual(groups.map((g) => [g.label, g.dates, g.items.map((i) => i.id).join('')]), [
    ['Day 1', 'Mon 2 Nov', 'b'],
    ['Week 1', '2–8 Nov', 'ed'],
    ['Week 2', '9–15 Nov', 'a'],
    ['Month 2', '30 Nov – 27 Dec', 'f'],
    ['Anytime', null, 'c'],
  ]);
});

test('the current phase follows today', () => {
  const start = parseDateInput('2026-11-02');
  const on = (d) => currentPhase(start, new Date(`${d}T10:00:00Z`));
  assert.equal(on('2026-10-30'), 'day1');
  assert.equal(on('2026-11-02'), 'day1');
  assert.equal(on('2026-11-03'), 'week1');
  assert.equal(on('2026-11-17'), 'weeks3-4');
  assert.equal(on('2027-03-01'), 'later');
});
