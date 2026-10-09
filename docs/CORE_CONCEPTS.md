# Core Concepts and Skills — AttendPro (Task 2)

This document explains the theory behind the key web-development concepts used in
AttendPro, each with a short example taken from the actual project source
(`index.html`, `style.css`, `script.js`). Nothing here is hypothetical: every
snippet below exists in the shipped code (paths and function names match).

> Learning note: the internship brief lists theory topics (semantics, layout,
> JavaScript fundamentals, DOM, CRUD, validation, dates, storage, search,
> accessibility, testing, Git) as **learning objectives**. This file maps each
> objective to the real code that demonstrates it.

---

## 1. HTML semantics, forms, validation

**Theory.** Semantic elements (`header`, `nav`, `main`, `section`, `table`,
`dialog`-like regions) describe *meaning*, not appearance. They help screen
readers, search engines, and keyboard navigation. Native form controls with
`<label for>` give focus management and basic validation for free.

**In AttendPro** (`index.html`): the app shell is landmarked, every input has
an associated label, and tables use header cells:

```html
<a class="skip-link" href="#mainContent">Skip to main content</a>
<aside class="sidebar" aria-label="Main navigation">…</aside>
<main class="content" id="mainContent">…</main>
<label class="lbl" for="attDate">Date</label>
<input class="input" id="attDate" type="date" />
```

JavaScript reinforces native validation with explicit checks and inline
messages instead of `alert()` (see §7).

## 2. CSS Flexbox, Grid, responsive design, reusable styling

**Theory.** Flexbox lays out one-dimensional rows/columns; Grid lays out
two-dimensional regions. Media queries switch layouts at breakpoints. Design
tokens (CSS variables) keep styling reusable and themable.

**In AttendPro** (`style.css`): stats use Grid, rows/toolbars use Flexbox, and
all colors come from variables so the light/dark theme is one attribute flip:

```css
:root{ --primary:#2563eb; --surface:#ffffff; --border:#e2e8f0; }
.grid.stats{ grid-template-columns:repeat(5,1fr); }
.att-row{ display:flex; align-items:center; gap:12px; }
@media(max-width:860px){
  .sidebar{ transform:translateX(-105%); }   /* off-canvas nav */
  .form-grid{ grid-template-columns:1fr; }   /* stacked forms   */
}
```

The hamburger button toggles `.open` on the sidebar — the same DOM works on
desktop, tablet, and mobile with no duplicate markup.

## 3. JavaScript variables, functions, arrays, objects, conditions, loops

**Theory.** State lives in variables; behavior in functions; collections in
arrays of objects; branches and loops transform them. Small pure helpers are
easier to test than logic buried in event handlers.

**In AttendPro** (`script.js`): attendance records are plain objects in an
array, and statistics are derived with conditions, not stored:

```js
const attState = { classId:'', section:'', date:todayISO(), marks:{}, remarks:{}, search:'' };
function dayCounts(date){
  const recs = getAttendance().filter(r => r.date === date);
  return {
    present: recs.filter(r => r.status === 'Present').length,
    holiday: recs.filter(r => r.status === 'Holiday').length,
    total: recs.length
  };
}
```

## 4. DOM selection, event listeners, dynamic rendering

**Theory.** `querySelector` finds nodes; listeners react to input; render
functions rebuild a view from state. AttendPro uses one render function per
page (`renderDashboard`, `renderStudents`, …) called by a tiny router:

```js
const $ = (sel) => document.querySelector(sel);
function showPage(name){
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  if (name === 'dashboard') renderDashboard();
  if (name === 'students')  renderStudents();
  …
}
$('#attSaveBtn').addEventListener('click', saveAttendance);
```

One listener per control, named handler functions, no inline `onclick`.

## 5. Array methods: `map`, `filter`, `find`, `reduce`

**Theory.** Declarative transforms replace manual index loops and most
off-by-one mistakes. AttendPro uses them for every query:

```js
// filter: roster for the selected class/section
getStudents().filter(s => s.classId === attState.classId && s.section === attState.section)
// find: lookups by id
const classById = (id) => getClasses().find(c => c.id === id);
// map: rows for CSV export
filteredStudents().map(s => ({ ID:s.id, Name:s.name, … }));
// reduce: highest student number for the ID counter
getStudents().map(s => Number(String(s.id).replace(/\D/g,'')) || 0).reduce((a,b) => Math.max(a,b), 0);
```

## 6. CRUD and separation of responsibilities

**Theory.** Create/Read/Update/Delete map to store helpers (`getX`/`setX`),
form builders (`openStudentModal`), and renderers (`renderStudents`). Storage,
UI, and statistics never mix: `studentStats()` reads records but never writes
them; `saveAttendance()` writes but never draws pixels.

Duplicate prevention is a data rule, not a UI trick — one record per
student + class + date, enforced with a key map:

```js
const byKey = new Map(all.map((a,i) => [a.studentId + '|' + a.classId + '|' + a.date, i]));
```

Re-saving therefore *updates* instead of duplicating (tested: T10).

## 7. Validation, error handling, edge cases

**Theory.** Validate at the boundary (forms, imports, storage), fail loudly
near the problem, and never trust stored data. AttendPro validates student
forms field-by-field with inline errors:

```js
setE('#ePPhone', !isPhone(parentPhone) ? 'Enter a valid 10-digit parent phone.' : '');
if (all.some(x => x.email.toLowerCase() === email.toLowerCase() && x.id !== s.id)) {
  setE('#eEmail', 'This email is already used by another student.'); return;
}
```

Edge cases handled: unmarked students on save (confirmation), deleting a
section that still has students (blocked), deleting a class with students
(cascade after confirmation), empty rosters/tables (empty-state artwork +
next action), corrupted `localStorage` (repaired by migration, §9).

## 8. Dates and percentage math

**Theory.** Store dates as `YYYY-MM-DD` strings: they sort correctly, compare
with `<`/`>`, and slice into month (`slice(0,7)`) and year (`slice(0,4)`) for
free — which is exactly how weekly/monthly/yearly reports are built
(`weekKey()` groups ISO weeks). Percentages must define their denominator:
holidays are *excluded* here because a holiday is not a school day:

```js
function attendancePct(list){
  const denom = list.length - list.filter(r => r.status === 'Holiday').length;
  if (!denom) return 0;
  const good = list.filter(r => r.status === 'Present' || r.status === 'Late').length;
  return Math.round((good / denom) * 1000) / 10;
}
```

Late counts as attended; Leave counts as missed but excused (shown
separately); Holiday never penalises the student.

## 9. localStorage, JSON, safe parsing

**Theory.** `localStorage` stores strings only, so state is serialised with
`JSON.stringify` and restored with `JSON.parse` inside `try/catch`. Quota,
private-mode, and hand-edited values can all throw or return wrong shapes —
so every read is guarded and every write goes through one `save()` helper:

```js
function loadArray(key){
  const v = load(key, []);            // load() catches parse errors
  return Array.isArray(v) ? v : [];   // wrong shapes become empty, never crash
}
```

`migrateData()` then repairs outdated records (missing parent fields, unknown
statuses, bad dates) and a monotonic counter (`sas_id_counter`) guarantees
deleted student IDs are never reused. JSON backup export/import reuses the
same shapes; imports are validated by `validateBackup()` *before* anything is
replaced (tested: T13, T20–T21).

## 10. Search, filtering, sorting, reports

**Theory.** One filter pipeline (`filteredReports()`) combines independent
criteria with early `return false`; sorting is a comparator away. The same
pipeline feeds the screen table, the counters, and the CSV export — so what
you see is what you export:

```js
return getAttendance().filter(a => {
  if (!per.test(a.date)) return false;   // daily / weekly / monthly / yearly
  if (c && a.classId !== c) return false;
  if (st && a.status !== st) return false;
  …
}).sort((a, b) => b.date.localeCompare(a.date));
```

## 11. Accessibility, maintainability, organisation

**Theory.** Accessibility is structural: landmarks, labels, focus, and text —
not colour alone (status always pairs a pill *label* with its colour).
Maintainability is layout: one file per layer, named functions, no dead code.

Concrete measures in AttendPro: skip link, `aria-label` nav, `aria-live`
toasts, labelled inputs, `scope="col"` on **all** table headers including
dynamically rendered ones (via `a11yTables()`, called after every render —
a real bug caught by testing, T17), keyboard focus moved into modals,
`Escape` closes dialogs, visible `:focus-visible` outlines, and
`prefers-…`-safe flat styling with a 44px+ touch-friendly mobile nav.

## 12. Testing, debugging, Git

**Theory.** Test the risky seams: persistence, duplicates, validation,
escaping, and calculations — with runnable checks, not claims. Debug with
reproduction first (the T17 scope failure was reproduced in isolation before
fixing). Version control with small, meaningful commits.

AttendPro's suite (`docs/TESTING.md`) runs 21 jsdom checks: boot, corrupt-
storage recovery, migration, login/roles, XSS escaping, duplicate rejection,
ID non-reuse, no-duplicate re-save, CSV quoting, backup round-trip, periods,
charts, leave flow, landmarks, responsive/print CSS — **21/21 passing** at the
time of writing. Git history starts from a `Baseline` commit; the Task 2
hardening is a separate commit, and nothing is pushed without authorisation.
