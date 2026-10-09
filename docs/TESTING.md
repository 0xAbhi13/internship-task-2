# Testing — AttendPro Task 2

## How tests were run (actually executed)

- **Environment:** Node.js v24 + `jsdom` (DOM simulation), Chart.js stubbed
  (canvas cannot render headlessly; chart *data/config creation* is verified,
  pixel rendering is not).
- **Command** (from the temp test folder used during development):
  `node smoke_task2.js` and `node smoke_task2b.js`
- **Static checks:** `node --check script.js` (syntax), grep audits for
  leftover theme hexes and `innerHTML` escaping coverage.
- **Result at time of writing: 21/21 automated checks PASS, 0 fail.**
- What was **not** run here: a real visual browser pass (layout eyeballing on
  phone/tablet, actual file-download dialogs, print preview, CDN chart pixels).
  Those are listed below as **MANUAL** steps for the submitter to confirm.

## Automated results (all executed, all passing)

| ID | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| T01 | Cold boot with empty storage | Demo seed loads (≥30 students) | 32 students, 5 classes seeded | PASS |
| T02 | Boot console output | No console errors | None | PASS |
| T03 | `sas_students` = `{broken json`, attendance = plain string | App recovers, no crash | Recovered, empty-state path | PASS |
| T04 | Dashboard after corrupt storage | Shows 0, no crash | `dTotalStudents` = 0 | PASS |
| T05 | Old record `{id,name}` + unknown status `Weird` | Migrated, status → Present | total=1, pct=100 | PASS |
| T06 | Admin login (demo creds) | App view shown | Shown | PASS |
| T07 | Student name `<script>alert(1)</script>` | Stored but rendered escaped | `&lt;script&gt;` in table, no raw tag | PASS |
| T08 | Reuse existing student email | Blocked with inline error | `eEmail` error shown | PASS |
| T09 | Delete a student, add twice | IDs never reuse deleted one | STU035, STU036 (deleted ID skipped) | PASS |
| T10 | Save attendance twice, same selection | No duplicate rows | 485 == 485 records | PASS |
| T11 | Bulk-mark Holiday + remark with quotes/commas | Saved verbatim | `Holiday`, note kept `"school closed"` | PASS |
| T12 | CSV quoting code path | RFC-style quoting present | `replace(/"/g` confirmed | PASS |
| T13 | `validateBackup` good/bad/null | ok / rejected / rejected | ok, `"students" must be an array.`, rejected | PASS |
| T14 | Data modal controls | Export/Import/Reset/Clear present | All four present | PASS |
| T15 | Yearly report + analytics charts | Label + ≥6 chart configs | `Yearly · 2026`, 10 charts | PASS |
| T16 | Approve pending leave | Status flips, simulated alert stored | Approved + `simulated` notification | PASS |
| T17 | Skip link + `scope="col"` on all `<th>` | Present incl. dynamic tables | `skip=true scope=col` (fixed a real bug: dynamic tables missed scope) | PASS |
| T18 | Responsive + print CSS | Media queries present | `max-width:860px` + `@media print` | PASS |
| T19 | CSV with `O"Brien, Jr.` | `"O""Brien, Jr."` | Byte-exact match | PASS |
| T20 | `collectBackup()` shape | Arrays + task tag | 32 students, task `WD-SCH-003` | PASS |
| T21 | Re-validate exported backup | Accepted | ok | PASS |

## Manual checklist (to confirm in a real browser before submission)

- [ ] Login as admin **and** teacher; teacher is blocked from class CRUD,
      student delete, data reset/clear (toast explains why).
- [ ] Register a new account; duplicate email is rejected.
- [ ] Add/edit/delete a student with parent fields; validation messages appear.
- [ ] Mark attendance for a class+section+date, Save, re-open: shows “Saved/Update”.
- [ ] Reports: switch Daily → Weekly → Monthly → Yearly; numbers change.
- [ ] Export students CSV and attendance CSV; open in Excel/Sheets, check commas/quotes.
- [ ] Data modal (⛁): Export JSON, then Clear all data (empty states appear),
      then Import the JSON (data returns).
- [ ] Corrupt-test (optional): edit a localStorage value to garbage, reload —
      app must still boot.
- [ ] Mobile 390px: hamburger opens sidebar; tables scroll horizontally;
      bulk buttons wrap; no page-level horizontal overflow.
- [ ] Print a report (Ctrl+P): only report content prints.
- [ ] Dark-mode toggle; charts re-render with dark grid.
- [ ] With charts online (CDN reachable): trend/donut/class/monthly/weekly/yearly draw.

## Bugs found by testing (fixed)

1. **Dynamic tables missed `th scope`** (T17 first run): `init()` set scope only
   once, but class-wise/summary tables render later. Fix: `a11yTables()` runs
   after every `showPage()`/`renderAll()`. Re-ran: PASS.
2. **Test-harness double-`init`** (earlier suite): JSDOM fires
   `DOMContentLoaded` after manual dispatch → double-bound handlers.
   Fix: `window.__sasInit` guard in `init()`. This also hardens the app
   against duplicate script inclusion.

## Limitations (honest)

- jsdom cannot render Chart.js pixels or open real download/print dialogs;
  those paths are code-verified + covered by the manual list above.
- No automated accessibility audit (axe/Lighthouse) was run; landmarks,
  labels, focus, and scope were verified programmatically instead.
- Performance/load testing was not performed (local dataset is small by design).
