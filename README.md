<div align="center">

# 🟢 AttendPro – Student Attendance System

[![Task](https://img.shields.io/badge/Task-WD--SCH--003-2563eb?style=for-the-badge)](https://github.com/your-username/student-attendance-system)
[![Student Code](https://img.shields.io/badge/Student_Code-DAS--SCH--003-2563eb?style=for-the-badge)](https://github.com/your-username/student-attendance-system)
[![Frontend Only](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-ffffff?style=for-the-badge&logo=javascript&logoColor=2563eb)](https://github.com/your-username/student-attendance-system)
[![Chart.js](https://img.shields.io/badge/Charts-Chart.js-DBEAFE?style=for-the-badge&logo=chartdotjs&logoColor=1e40af)](https://github.com/your-username/student-attendance-system)
[![No Backend](https://img.shields.io/badge/Storage-localStorage-2563eb?style=for-the-badge)](https://github.com/your-username/student-attendance-system)

![typing](https://readme-typing-svg.herokuapp.com?font=Segoe+UI&size=20&duration=2600&pause=900&color=1e40af&center=true&vCenter=true&width=700&lines=Daily+Attendance+in+one+click...;Weekly+%E2%80%A2+Monthly+%E2%80%A2+Yearly+reports...;Present+%E2%80%A2+Absent+%E2%80%A2+Late+%E2%80%A2+Leave+%E2%80%A2+Holiday...;Simulated+parent+alerts+%E2%80%94+no+real+SMS...)


---

## ✨ Overview

**AttendPro** is a frontend-only school attendance system: mark daily attendance with remarks, track **Present / Absent / Late / Leave / Holiday**, manage students (with parent info) and **Classes 1–10 · sections A/B/C**, approve leaves, analyse **daily / weekly / monthly / yearly** trends with Chart.js, export CSV, print reports, and fire **simulated** parent SMS/email alerts. All data lives in JS arrays/objects persisted to `localStorage` — no backend, no database, no API keys.

<details open>
<summary><b>▶ 60-second click path (expand)</b></summary>

1. Login as `admin@attendpro.com` / `admin123` (or one-click Fill buttons)
2. **Dashboard** → check today + class-wise table + low-attendance alerts
3. **Daily Attendance** → pick Class 8 · B → bulk-mark → add a remark → Save
4. **Attendance Report** → switch Daily → Weekly → Monthly → Yearly → Export CSV
5. **Analytics & Insights** → trend + weekly + monthly + yearly charts
6. **Notifications** → Simulate parent alerts (labelled SIMULATED)

</details>

---

## 📋 Task reference

| Field | Value |
|---|---|
| Organization | Data Alcott Systems |
| Project | AttendPro – Student Attendance System |
| Task ID | `WD-SCH-003` |
| Student Code | `DAS-SCH-003` |
| Domain | Web Development |
| Type | Frontend-only, no database required |
| Repo | `student-attendance-system` |
| Task 2 | **Core Concepts and Skills** — this submission hardens the app (safe storage + migration, JSON backup/restore, XSS-safe rendering, a11y landmarks) and documents the theory in `docs/CORE_CONCEPTS.md`, with executed tests in `docs/TESTING.md` and the full report in `docs/Internship_Task_2_Core_Concepts_and_Skills.docx` |

> **Theme note (honest):** the Task 2 brief text references the green theme
> (`#10B981`), but per an explicit instruction during development the submitted
> UI uses the blue primary (`#2563eb`). All screenshots, docs, and the favicon
> match the shipped blue theme.

---

## 🧩 Features (all functional, no placeholders)

<details open>
<summary><b>Dashboard</b> — data-driven, never hard-coded</summary>

- Daily stats: Present / Absent / Late / Leave / **Holiday** + totals
- Class-wise attendance table for the latest recorded day
- Absenteeism alerts (< 75%), recent activity, 7-day trend + overall doughnut
</details>

<details>
<summary><b>Student Management</b> — Add · Edit · Delete · View · Search · Filter</summary>

Fields: **ID, Name, Class, Section, Roll Number, Parent Name, Parent Phone, Address** (+ email/phone/status kept as useful extras).
Validation (required, email, 10-digit phones, unique email, unique roll per class+section) + delete confirmation + CSV export + profile modal linked to history.
</details>

<details>
<summary><b>Class Management</b> — Class 1–10 · A/B/C + custom allowed</summary>

Fields: **Class ID, Class Name, Section, Class Teacher, Strength** (+ room). Demo seeds Classes 6–10 with A/B/C. Name input suggests Class 1–10 but accepts custom values. Strength vs enrolled shown per section. Admin-only create/edit/delete.
</details>

<details>
<summary><b>Daily Attendance</b> — 5 statuses + remarks + bulk</summary>

**Present / Absent / Late / Leave / Holiday**. Record = ID, Student ID, Class ID (+section), Date, Status, Remarks. Date/class/section pickers, search, per-student remarks, bulk buttons (All present/absent/leave/holiday), Reset, Save/Update. Duplicate-proof on **student + class + date**. Simulated parent-SMS button for absentees.
</details>

<details>
<summary><b>Attendance Report</b> — Daily · Weekly · Monthly · Yearly</summary>

Filter by class, date/month/year, student, status. Live P/A/Lt/Lv/H counters, period label (e.g. “Weekly · 12 May → 18 May”), 400-row table with remarks. **CSV export + Print/PDF** (browser print CSS). Summary tab: class-wise %, below-75% list, monthly + yearly overviews.
</details>

<details>
<summary><b>Student History</b></summary>

Per-student Present / Absent / Late / Leave / **Holiday** counts, % (holidays excluded), progress bar, parent + address header, date-wise table, CSV + print.
</details>

<details>
<summary><b>Leave Management</b> — ID · Student ID · From · To · Reason · Status</summary>

Apply, view history, **Pending / Approve / Reject**, delete. Parent update notifications are simulated.
</details>

<details>
<summary><b>Analytics & Insights</b> (Chart.js, real data)</summary>

Daily trend, Present-vs-rest doughnut, class-wise %, **monthly**, **weekly**, **yearly** bars. Range selector (7/14/30 days). Holidays excluded from %.
</details>

<details>
<summary><b>Notifications</b> — SIMULATED parent alerts</summary>

Attendance-saved, attendance/absenteeism alerts, leave updates, student added/deleted. Every item badged `SIMULATED` — **no real SMS/email/WhatsApp is sent**. Bell dropdown + full page + “Simulate parent alerts” generator.
</details>

<details>
<summary><b>Bonus features included</b></summary>

- [x] CSV export + print-friendly reports
- [x] Simulated email/SMS notifications
- [x] Trend charts + absenteeism alerts
- [x] Student profile with attendance
- [x] Dark-mode toggle (bonus, kept)
- [x] Bulk attendance marking + remarks

</details>

---

## 🎨 Theme

Blue primary theme used across the app:

| Token | Value | Use |
|---|---|---|
| Primary blue | `#2563eb` | buttons, active nav, charts, badges |
| White | `#FFFFFF` | surfaces, cards |
| Light blue | `#EFF6FF` | soft backgrounds, pills, alerts |

Dark mode is a bonus theme. No excessive glassmorphism/gradients/animations in the app itself.

---

## 🛠 Technologies

- **HTML5** (`index.html`) — auth + 9 modules + modals
- **CSS3** (`style.css`) — blue design system, responsive sidebar/topbar/tables/forms/charts
- **Vanilla JS** (`script.js`) — store, seed, auth, CRUD, attendance, periods, charts, simulated alerts
- **Chart.js 4 (CDN)** — charts only
- **localStorage** — persistence (arrays/objects serialized)

No PHP · MySQL · Firebase · Node backend · Express · external DB · paid APIs · API keys.

---

## 📁 Project structure

```text
student-attendance-system/
├── index.html   # AttendPro UI: auth, dashboard, students, classes,
│                # daily attendance, reports (D/W/M/Y), history,
│                # leaves, analytics, notifications, modals
├── style.css    # #2563eb / #FFFFFF / #DBEAFE theme + responsive
├── script.js    # models, seed (v2), 5-status attendance, periods,
│                # weekly/monthly/yearly analytics, simulated alerts
├── README.md    # this animated file
├── docs/        # CORE_CONCEPTS.md · TESTING.md · Task 2 Word report (.docx)
└── assets/      # favicon set + screenshots + demo.gif for submission
```

---

## 🚀 Setup

**Open directly:**

1. Download/clone `student-attendance-system`.
2. Open `index.html` in Chrome/Edge/Firefox.
3. Login below. (Internet needed once for Chart.js CDN.)

**Local server (recommended):**

```bash
cd student-attendance-system
npx serve .
# or
python -m http.server 8000
# → http://localhost:8000
```

**Reset demo data:** sidebar ↺ Reset (admin, confirmed). Fresh seed = v2 (parent info, Class 6–10, 16 days incl. holiday).

---

## 🔑 Demo credentials (frontend-only, NOT secure)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@attendpro.com` | `admin123` |
| Teacher | `teacher@attendpro.com` | `teacher123` |

One-click **Fill admin/teacher login** buttons on the login card. Register creates more users (stored plain-text in localStorage — demo only). Admin: full access. Teacher: no class CRUD, no student delete, no reset (blocked with explanation). Role pill shows in sidebar.

---

## 💾 Data & localStorage

| Key | Content |
|---|---|
| `sas_users` | users `{id,name,email,pass,role}` (plain text — demo) |
| `sas_session` | current login |
| `sas_students` | `{id,name,classId,section,roll,parentName,parentPhone,address,email,phone,status}` |
| `sas_classes` | `{id,name,sections,teacher,room,capacity=strength}` |
| `sas_attendance` | `{id,studentId,classId,section,date,status,note=remarks,…}` — unique on student+class+date |
| `sas_leaves` | `{id,studentId,type,startDate=From,endDate=To,reason,status,…}` |
| `sas_notifications` | simulated alerts |
| `sas_theme` | light/dark |
| `sas_seeded_v2` | seed flag |
| `sas_id_counter` | monotonic student-ID counter (deleted IDs never reused) |
| `sas_schema_v1` | storage-schema marker written by migration |

Seed: **32 students w/ parents, Classes 6–10 (A/B/C), ~480 records over 16 working days incl. a full Holiday, 6 leaves, 6 simulated notifs.**
% formula everywhere: `(Present + Late) / (Total − Holiday) × 100`.

**Task 2 hardening:** every read is guarded (`loadArray` rejects non-arrays),
`migrateData()` repairs outdated/hand-edited records on boot, imports are
validated by `validateBackup()` before replacing anything, and the ⛁ **Data**
button (topbar) offers JSON export / validated import / demo reset / clear-all
(with empty states when cleared).

---

## 🧠 Core concepts (Task 2)

Each concept below is demonstrated by real shipped code — full theory +
snippets in [`docs/CORE_CONCEPTS.md`](docs/CORE_CONCEPTS.md):

| # | Concept | Where it lives |
|---|---|---|
| 1 | HTML semantics, forms, validation | landmarks, labelled inputs, inline errors |
| 2 | Flexbox, Grid, responsive, tokens | `style.css` layout + breakpoints + variables |
| 3 | Variables, functions, arrays, objects | `attState`, `dayCounts()` |
| 4 | DOM selection, listeners, rendering | `showPage()` router, one render/page |
| 5 | `map` / `filter` / `find` / `reduce` | rosters, lookups, CSV rows, ID counter |
| 6 | CRUD + separation of responsibilities | `getX`/`setX`, modals, renderers, key-map dedupe |
| 7 | Validation, errors, edge cases | inline field errors, confirmations, guards |
| 8 | Dates + percentage math | ISO dates, `weekKey()`, `attendancePct()` |
| 9 | localStorage, JSON, safe parsing | `loadArray`, `migrateData`, backup/restore |
| 10 | Search, filter, sort, reports | `filteredReports()` feeds table + CSV |
| 11 | Accessibility, maintainability | skip link, `scope="col"`, modal focus, one-file-per-layer |
| 12 | Testing, debugging, Git | `docs/TESTING.md`, `__sasInit` guard, commits |

---

## 🏗 Architecture & data flow

```text
UI events → handlers → validate → store helpers → localStorage
                ↓                        ↓
           render(page) ← derived stats (never stored)
```

- **State:** in-memory JS arrays/objects, mirrored to localStorage on every write.
- **Derived data:** percentages, rosters, report rows are recomputed on render —
  nothing is cached, so numbers can never go stale.
- **Layers:** `index.html` (structure) → `style.css` (presentation) →
  `script.js` sections: helpers → storage/seed/migrate → auth → notifications →
  page renders → reports/analytics → events → init. Docs live in `docs/`.

---

## ✅ Testing (actually run)

**21/21 automated jsdom checks pass** — boot, corrupt-storage recovery,
migration, login/roles, XSS escaping, duplicate rejection, ID non-reuse,
no-duplicate re-save, CSV quoting (byte-exact), backup round-trip, periods,
charts, leave flow, landmarks, responsive/print CSS. Full table + honest
manual checklist (real browser, downloads, print, mobile eyeballing) in
[`docs/TESTING.md`](docs/TESTING.md). Word report:
`docs/Internship_Task_2_Core_Concepts_and_Skills.docx`.

---

## 📸 Screenshots (add for submission)

```text
assets/
├── 01-login.png
├── 02-dashboard.png
├── 03-students.png
├── 04-attendance.png
├── 05-reports.png
├── 06-analytics.png
└── demo.gif   ← record & save here to autoplay at the top
```

```markdown
![Login](assets/01-login.png)
![Dashboard](assets/02-dashboard.png)
![Students](assets/03-students.png)
![Daily Attendance](assets/04-attendance.png)
![Reports D/W/M/Y](assets/05-reports.png)
![Analytics](assets/06-analytics.png)
```

Capture at 1440px + 390px (mobile sidebar open) to prove responsiveness.

---

## 🌐 Deployment (static only)

**GitHub Pages:** push repo `student-attendance-system` → Settings → Pages → Deploy from branch → `main` / root → `https://<you>.github.io/student-attendance-system/`.
**Netlify:** drag folder into Netlify Drop (no build, publish `.`).
**Vercel:** import repo, preset Other/static, no build.
No env vars or keys needed.

---

## ⚠️ Limitations

- Browser-local data only (devices don't sync); clearing site data wipes it.
- Demo auth is plain-text + UI-level roles — not real security.
- Notifications are **simulated** (badged in UI); no SMS/email delivery.
- Chart.js needs internet on first load (graceful fallback offline).
- Print/PDF via browser dialog; pagination varies.

---

## 🔮 Future improvements

- Real backend (Postgres/Supabase) + hashed auth + audit log
- Period-wise timetable attendance, CSV student import, PDF lib export
- Real parent messaging gateway, parent portal, PWA offline, i18n
- Playwright/Vitest suite, a11y audit

---

## ✅ Submission checklist

- [ ] Repo `student-attendance-system` (+ live URL)
- [ ] Screenshots + `demo.gif` in `assets/`
- [ ] Report mentions WD-SCH-003 + DAS-SCH-003
- [ ] Demo video: login → dashboard → attendance w/ Holiday+remarks → weekly/yearly reports → analytics → simulated alerts
- [ ] No fabricated certificates/reviews

<div align="center">

![footer](https://readme-typing-svg.herokuapp.com?font=Segoe+UI&size=15&duration=3000&color=1e40af&center=true&width=600&lines=AttendPro+%E2%80%A2+green+%232563eb+%E2%80%A2+clean+data+UI;Daily+%E2%80%A2+Weekly+%E2%80%A2+Monthly+%E2%80%A2+Yearly;No+backend+%E2%80%A2+no+keys+%E2%80%A2+just+open+index.html)

</div>
