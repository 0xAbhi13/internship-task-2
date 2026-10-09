/* ==========================================================================
   AttendPro – Student Attendance System — script.js
   Data Alcott Systems · Task ID: WD-SCH-003 · Student Code: DAS-SCH-003
   Frontend-only app. Data in JS arrays/objects, persisted via localStorage.
   Charts via Chart.js. Notifications are SIMULATED (no real SMS/email).
   ========================================================================== */
'use strict';

/* ---------------- Helpers ---------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function uid(prefix) {
  return (prefix || 'ID') + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
}
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function isoDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return esc(iso);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(ts) {
  try { return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return ''; }
}
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); }
function phoneDigits(v) { return String(v || '').replace(/\D/g, ''); }
function isPhone(v) {
  const d = phoneDigits(v);
  if (d.length === 10) return true;
  if (d.length === 12 && d.startsWith('91')) return true;
  if (d.length === 11 && d.startsWith('0')) return true;
  return false;
}
function downloadCSV(filename, rows) {
  if (!rows || !rows.length) { toast('Nothing to export', 'No rows match the current filters.', 'warn'); return; }
  const headers = Object.keys(rows[0]);
  const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csv = [headers.map(q).join(',')]
    .concat(rows.map(r => headers.map(h => q(r[h])).join(','))).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

/* ---------------- Toast ---------------- */
function toast(title, msg, type) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'error' ? 'error' : type === 'warn' ? 'warn' : type === 'success' ? 'success' : '');
  el.innerHTML = '<div style="font-size:16px">' +
    (type === 'success' ? '✔' : type === 'error' ? '✘' : type === 'warn' ? '⚠' : 'ℹ') +
    '</div><div><b>' + esc(title) + '</b>' + (msg ? '<span>' + esc(msg) + '</span>' : '') + '</div>';
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 3400);
}

/* ---------------- Confirm dialog ---------------- */
let _confirmResolve = null;
function confirmAction(title, msg, dangerLabel) {
  $('#confirmTitle').textContent = title || 'Confirm';
  $('#confirmMsg').textContent = msg || 'Are you sure?';
  $('#confirmYes').textContent = dangerLabel || 'Confirm';
  $('#confirmModal').classList.add('open');
  return new Promise((resolve) => { _confirmResolve = resolve; });
}
function closeConfirm(val) {
  $('#confirmModal').classList.remove('open');
  if (_confirmResolve) { _confirmResolve(val); _confirmResolve = null; }
}

/* ---------------- Generic modal ---------------- */
function openModal(title, bodyHTML, footHTML) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHTML;
  $('#modalFoot').innerHTML = footHTML || '';
  $('#modal').classList.add('open');
  // Accessibility: move keyboard focus into the dialog.
  const dlg = $('#modal .modal');
  if (dlg) { dlg.setAttribute('tabindex', '-1'); dlg.focus({ preventScroll: true }); }
}
function closeModal() { $('#modal').classList.remove('open'); }

/* ---------------- Storage ---------------- */
const K = {
  users: 'sas_users', session: 'sas_session', students: 'sas_students',
  classes: 'sas_classes', attendance: 'sas_attendance', leaves: 'sas_leaves',
  notifs: 'sas_notifications', theme: 'sas_theme', seeded: 'sas_seeded_v2',
  counter: 'sas_id_counter', schema: 'sas_schema_v1'
};
const VALID_STATUSES = ['Present', 'Absent', 'Late', 'Leave', 'Holiday'];
const VALID_LEAVE = ['Pending', 'Approved', 'Rejected'];
function load(key, fallback) {
  // Safe parse: missing, malformed or non-JSON storage never crashes the app.
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) { return fallback; }
}
function loadArray(key) {
  // Objects, strings or anything non-array shaped are treated as empty.
  const v = load(key, []);
  return Array.isArray(v) ? v : [];
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const getStudents = () => loadArray(K.students);
const setStudents = (v) => save(K.students, v);
const getClasses = () => loadArray(K.classes);
const setClasses = (v) => save(K.classes, v);
const getAttendance = () => loadArray(K.attendance);
const setAttendance = (v) => save(K.attendance, v);
const getLeaves = () => loadArray(K.leaves);
const setLeaves = (v) => save(K.leaves, v);
const getNotifs = () => loadArray(K.notifs);
const setNotifs = (v) => save(K.notifs, v);

/* Migrate + repair stored data (Task 2: missing/malformed/outdated storage).
   Fills new fields with safe defaults and drops records that are unusable,
   so an old or hand-edited localStorage can never break rendering. */
function migrateData() {
  const str = (v) => String(v == null ? '' : v);
  const classIds = new Set(getClasses().filter(c => c && c.id).map(c => String(c.id)));
  const students = getStudents()
    .filter(s => s && (s.id || s.name))
    .map((s, i) => ({
      id: str(s.id) || ('STU' + String(i + 1).padStart(3, '0')),
      name: str(s.name) || 'Unnamed student',
      classId: str(s.classId), section: str(s.section) || 'A',
      roll: Number(s.roll) >= 1 ? Number(s.roll) : (i + 1),
      parentName: str(s.parentName), parentPhone: str(s.parentPhone), address: str(s.address),
      email: str(s.email), phone: str(s.phone),
      status: s.status === 'inactive' ? 'inactive' : 'active',
      createdAt: str(s.createdAt) || new Date().toISOString()
    }));
  const stuIds = new Set(students.map(s => s.id));
  const attendance = getAttendance()
    .filter(a => a && a.studentId && a.date)
    .map(a => ({
      id: str(a.id) || uid('ATT'),
      studentId: str(a.studentId),
      classId: str(a.classId), section: str(a.section) || 'A',
      date: /^\d{4}-\d{2}-\d{2}$/.test(str(a.date)) ? str(a.date) : todayISO(),
      status: VALID_STATUSES.includes(a.status) ? a.status : 'Present',
      note: str(a.note), markedBy: str(a.markedBy),
      updatedAt: str(a.updatedAt) || new Date().toISOString()
    }));
  const leaves = getLeaves()
    .filter(l => l && l.studentId)
    .map(l => ({
      id: str(l.id) || uid('LV'),
      studentId: str(l.studentId), type: str(l.type) || 'General',
      startDate: str(l.startDate) || todayISO(), endDate: str(l.endDate) || str(l.startDate) || todayISO(),
      reason: str(l.reason), status: VALID_LEAVE.includes(l.status) ? l.status : 'Pending',
      submittedAt: str(l.submittedAt) || new Date().toISOString(),
      decidedBy: str(l.decidedBy), decidedAt: str(l.decidedAt)
    }));
  const notifs = getNotifs()
    .filter(n => n && (n.title || n.message))
    .map(n => ({
      id: str(n.id) || uid('N'), title: str(n.title) || 'Notice', message: str(n.message),
      type: str(n.type) || 'info', time: str(n.time) || new Date().toISOString(), read: !!n.read
    })).slice(0, 200);
  const users = loadArray(K.users)
    .filter(u => u && u.email && u.id)
    .map(u => ({
      id: str(u.id), name: str(u.name) || 'User', email: str(u.email),
      pass: str(u.pass), role: u.role === 'admin' ? 'admin' : 'teacher',
      createdAt: str(u.createdAt) || new Date().toISOString()
    }));
  setStudents(students); setAttendance(attendance); setLeaves(leaves);
  setNotifs(notifs); save(K.users, users);
  void classIds; void stuIds;
  localStorage.setItem(K.schema, 'v1');
}
/* Monotonic student-ID counter: deleted IDs are never reused, so historic
   attendance rows can never be silently re-attached to a new student. */
function nextStudentId() {
  let n = Number(localStorage.getItem(K.counter) || 0);
  const maxExisting = getStudents()
    .map(s => Number(String(s.id).replace(/\D/g, '')) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  n = Math.max(n, maxExisting) + 1;
  localStorage.setItem(K.counter, String(n));
  return 'STU' + String(n).padStart(3, '0');
}

/* ---------------- Seed data ---------------- */
function lastWorkingDays(n) {
  const out = [];
  const d = new Date();
  while (out.length < n) {
    if (d.getDay() !== 0) {
      out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    }
    d.setDate(d.getDate() - 1);
  }
  return out.reverse();
}

function buildSeedData() {
  // Task structure: Class ID, Class Name, Section, Class Teacher, Strength.
  // Demo covers Classes 6–10 with sections A, B, C (Class 1–10 supported; custom allowed).
  const classes = [
    { id: 'CLS01', name: 'Class 6', sections: ['A', 'B', 'C'], teacher: 'Sarah Thomas', room: 'Block A · R-101', capacity: 60 },
    { id: 'CLS02', name: 'Class 7', sections: ['A', 'B'], teacher: 'Rahul Verma', room: 'Block A · R-102', capacity: 60 },
    { id: 'CLS03', name: 'Class 8', sections: ['A', 'B', 'C'], teacher: 'Meera Iyer', room: 'Block B · R-201', capacity: 60 },
    { id: 'CLS04', name: 'Class 9', sections: ['A', 'B'], teacher: 'Dr. Arvind Menon', room: 'Block B · Lab-1', capacity: 50 },
    { id: 'CLS05', name: 'Class 10', sections: ['A', 'B'], teacher: 'Kavitha Rao', room: 'Block C · R-301', capacity: 50 }
  ];

  // Task student fields: ID, Name, Class, Section, Roll Number, Parent Name,
  // Parent Phone, Address (+ email/phone/status kept as useful extras).
  const raw = [
    ['Aarav Sharma', 'CLS01', 'A', 'Rajesh Sharma', '12, MG Road, Pune'], ['Diya Patel', 'CLS01', 'A', 'Suresh Patel', '45, Station Road, Ahmedabad'],
    ['Kabir Singh', 'CLS01', 'A', 'Harpreet Singh', '78, Model Town, Delhi'], ['Ananya Reddy', 'CLS01', 'A', 'Venkat Reddy', '23, Banjara Hills, Hyderabad'],
    ['Vihaan Gupta', 'CLS01', 'A', 'Manoj Gupta', '9, Civil Lines, Jaipur'], ['Ishita Nair', 'CLS01', 'B', 'Sreejith Nair', '11, Marine Drive, Kochi'],
    ['Arjun Mehta', 'CLS01', 'B', 'Prakash Mehta', '34, CG Road, Ahmedabad'], ['Sanya Kapoor', 'CLS01', 'B', 'Vikas Kapoor', '56, Sector 21, Chandigarh'],
    ['Rohan Joshi', 'CLS01', 'C', 'Anil Joshi', '7, FC Road, Pune'], ['Priya Sharma', 'CLS02', 'A', 'Deepak Sharma', '90, Rajpur Road, Dehradun'],
    ['Aditya Kumar', 'CLS02', 'A', 'Ramesh Kumar', '12, Boring Road, Patna'], ['Sneha Pillai', 'CLS02', 'A', 'Ravi Pillai', '44, MG Road, Kochi'],
    ['Yash Thakur', 'CLS02', 'A', 'Mohan Thakur', '31, Mall Road, Shimla'], ['Riya Malhotra', 'CLS02', 'A', 'Sanjay Malhotra', '18, GK-2, Delhi'],
    ['Karan Yadav', 'CLS02', 'B', 'Suraj Yadav', '5, Aliganj, Lucknow'], ['Pooja Desai', 'CLS02', 'B', 'Nilesh Desai', '27, Law Garden, Ahmedabad'],
    ['Nikhil Bose', 'CLS02', 'B', 'Subrata Bose', '63, Salt Lake, Kolkata'], ['Tanvi Kulkarni', 'CLS02', 'B', 'Sachin Kulkarni', '8, Prabhat Road, Pune'],
    ['Rahul Singh', 'CLS03', 'A', 'Ajay Singh', '71, Gomti Nagar, Lucknow'], ['Simran Kaur', 'CLS03', 'A', 'Gurmeet Kaur', '22, Model Town, Amritsar'],
    ['Aman Verma', 'CLS03', 'A', 'Rakesh Verma', '40, Sector 62, Noida'], ['Neha Gupta', 'CLS03', 'A', 'Pawan Gupta', '15, Malviya Nagar, Jaipur'],
    ['Vikram Rao', 'CLS03', 'A', 'Krishna Rao', '29, Jubilee Hills, Hyderabad'], ['Divya Menon', 'CLS03', 'B', 'Suresh Menon', '6, Panampilly Nagar, Kochi'],
    ['Sanjay Patil', 'CLS03', 'B', 'Vasant Patil', '52, Shivaji Nagar, Pune'], ['Lakshmi Venkat', 'CLS03', 'C', 'Venkat Iyer', '3, Mylapore, Chennai'],
    ['Harsh Vardhan', 'CLS03', 'C', 'Umesh Vardhan', '19, Rajaji Nagar, Bengaluru'], ['Pooja Nair', 'CLS04', 'A', 'Mohan Nair', '77, Vyttila, Kochi'],
    ['Arnav Deshpande', 'CLS04', 'A', 'Milind Deshpande', '41, Kothrud, Pune'], ['Shreya Kulkarni', 'CLS04', 'B', 'Nitin Kulkarni', '13, Deccan, Pune'],
    ['Kunal Shah', 'CLS05', 'A', 'Jignesh Shah', '60, Satellite, Ahmedabad'], ['Ritu Agarwal', 'CLS05', 'B', 'Alok Agarwal', '25, Vaishali, Jaipur']
  ];

  const rollCounter = {};
  const students = raw.map((r, i) => {
    const key = r[1] + '|' + r[2];
    rollCounter[key] = (rollCounter[key] || 0) + 1;
    const num = String(i + 1).padStart(3, '0');
    const email = r[0].toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') + '.' + num + '@school.edu';
    const phone = '98' + String(10000000 + ((i * 7319737) % 89999999));
    const pphone = '99' + String(10000000 + ((i * 5173811 + 1234567) % 89999999));
    const inactive = (r[0] === 'Rohan Joshi' || r[0] === 'Harsh Vardhan');
    return {
      id: 'STU' + num, name: r[0], classId: r[1], section: r[2],
      roll: rollCounter[key], parentName: r[3], parentPhone: pphone, address: r[4],
      email: email, phone: phone,
      status: inactive ? 'inactive' : 'active',
      createdAt: new Date(Date.now() - 90 * 864e5).toISOString()
    };
  });

  const lowNames = { 'Yash Thakur': 1, 'Karan Yadav': 1 };
  const dates = lastWorkingDays(16);
  const holidayDate = dates[3];
  const attendance = [];
  students.forEach((s, si) => {
    if (s.status !== 'active') return;
    dates.forEach((dt, di) => {
      if (dt === holidayDate) {
        attendance.push({ id: uid('ATT'), studentId: s.id, classId: s.classId, section: s.section, date: dt, status: 'Holiday', note: 'Diwali break (demo holiday)', markedBy: 'Seeded demo', updatedAt: new Date().toISOString() });
        return;
      }
      const dayNum = Number(dt.slice(8, 10));
      const h = (si * 37 + di * 53 + dayNum * 11) % 100;
      let status;
      if (lowNames[s.name]) {
        status = h < 50 ? 'Present' : h < 70 ? 'Absent' : h < 82 ? 'Late' : h < 92 ? 'Leave' : 'Holiday';
      } else {
        status = h < 79 ? 'Present' : h < 85 ? 'Absent' : h < 91 ? 'Late' : h < 96 ? 'Leave' : 'Holiday';
      }
      attendance.push({
        id: uid('ATT'), studentId: s.id, classId: s.classId, section: s.section,
        date: dt, status: status, note: '', markedBy: 'Seeded demo',
        updatedAt: new Date().toISOString()
      });
    });
  });

  const byName = (n) => students.find(s => s.name === n).id;
  const leaves = [
    { id: uid('LV'), studentId: byName('Diya Patel'), type: 'Sick', startDate: isoDaysAgo(3), endDate: isoDaysAgo(2), reason: 'Viral fever, doctor advised rest for two days.', status: 'Pending', submittedAt: new Date(Date.now() - 2 * 864e5).toISOString() },
    { id: uid('LV'), studentId: byName('Aman Verma'), type: 'Casual', startDate: isoDaysAgo(1), endDate: isoDaysAgo(1), reason: 'Family function in hometown.', status: 'Pending', submittedAt: new Date(Date.now() - 1 * 864e5).toISOString() },
    { id: uid('LV'), studentId: byName('Shreya Kulkarni'), type: 'Emergency', startDate: todayISO(), endDate: todayISO(), reason: 'Medical emergency, will submit certificate.', status: 'Pending', submittedAt: new Date().toISOString() },
    { id: uid('LV'), studentId: byName('Sneha Pillai'), type: 'Family', startDate: isoDaysAgo(8), endDate: isoDaysAgo(7), reason: 'Attended cousin wedding out of station.', status: 'Approved', submittedAt: new Date(Date.now() - 9 * 864e5).toISOString(), decidedBy: 'Meera Iyer', decidedAt: new Date(Date.now() - 8 * 864e5).toISOString() },
    { id: uid('LV'), studentId: byName('Vikram Rao'), type: 'Sick', startDate: isoDaysAgo(6), endDate: isoDaysAgo(5), reason: 'Food poisoning, under medication.', status: 'Approved', submittedAt: new Date(Date.now() - 7 * 864e5).toISOString(), decidedBy: 'Meera Iyer', decidedAt: new Date(Date.now() - 6 * 864e5).toISOString() },
    { id: uid('LV'), studentId: byName('Karan Yadav'), type: 'Casual', startDate: isoDaysAgo(5), endDate: isoDaysAgo(5), reason: 'Personal work.', status: 'Rejected', submittedAt: new Date(Date.now() - 6 * 864e5).toISOString(), decidedBy: 'Rahul Verma', decidedAt: new Date(Date.now() - 5 * 864e5).toISOString() }
  ];

  const now = Date.now();
  const notifs = [
    { id: uid('N'), title: 'Welcome to AttendPro (simulated demo)', message: 'Demo data loaded: 32 students with parent info, Classes 6–10, 16 days of attendance incl. a holiday.', type: 'info', time: new Date(now - 3 * 36e5).toISOString(), read: false },
    { id: uid('N'), title: 'Attendance saved (simulated)', message: 'Attendance for Class 10 · A was saved. Parent alerts simulated — no real SMS sent.', type: 'success', time: new Date(now - 26 * 36e5).toISOString(), read: false },
    { id: uid('N'), title: 'Absenteeism alert (simulated parent SMS)', message: 'SIMULATED SMS to parent of Yash Thakur: attendance below 75%. No real message sent.', type: 'warning', time: new Date(now - 28 * 36e5).toISOString(), read: false },
    { id: uid('N'), title: 'New leave request', message: 'Diya Patel requested Sick leave for 2 days.', type: 'info', time: new Date(now - 30 * 36e5).toISOString(), read: false },
    { id: uid('N'), title: 'Leave approved (simulated parent update)', message: 'Sneha Pillai’s Family leave was approved. Parent notified (simulated).', type: 'success', time: new Date(now - 50 * 36e5).toISOString(), read: true },
    { id: uid('N'), title: 'Student added', message: 'Ritu Agarwal was added to Class 10 · B with parent details.', type: 'success', time: new Date(now - 70 * 36e5).toISOString(), read: true }
  ];

  const users = [
    { id: 'U-admin', name: 'Admin User', email: 'admin@attendpro.com', pass: 'admin123', role: 'admin', createdAt: new Date().toISOString() },
    { id: 'U-teacher', name: 'Demo Teacher', email: 'teacher@attendpro.com', pass: 'teacher123', role: 'teacher', createdAt: new Date().toISOString() }
  ];

  return { classes, students, attendance, leaves, notifs, users };
}

function seedIfNeeded() {
  if (localStorage.getItem(K.seeded) === 'yes') {
    if (!localStorage.getItem(K.users)) {
      save(K.users, [
        { id: 'U-admin', name: 'Admin User', email: 'admin@attendpro.com', pass: 'admin123', role: 'admin', createdAt: new Date().toISOString() },
        { id: 'U-teacher', name: 'Demo Teacher', email: 'teacher@attendpro.com', pass: 'teacher123', role: 'teacher', createdAt: new Date().toISOString() }
      ]);
    }
    return;
  }
  const s = buildSeedData();
  setClasses(s.classes); setStudents(s.students); setAttendance(s.attendance);
  setLeaves(s.leaves); setNotifs(s.notifs); save(K.users, s.users);
  localStorage.setItem(K.seeded, 'yes');
  migrateData();
}

async function resetDemoData() {
  const ok = await confirmAction('Reset demo data?', 'All students, attendance, leaves and notifications will be replaced with fresh demo data. This cannot be undone.', 'Reset data');
  if (!ok) return;
  localStorage.removeItem(K.seeded);
  ['sas_students', 'sas_classes', 'sas_attendance', 'sas_leaves', 'sas_notifications'].forEach(k => localStorage.removeItem(k));
  seedIfNeeded();
  pushNotif('Demo data reset (simulated)', 'Fresh AttendPro demo dataset loaded: Classes 6–10, parent info, 16 days incl. holiday.', 'info');
  renderAll();
  toast('Demo data reset', 'Fresh demo dataset loaded.', 'success');
}

/* ---------------- Auth ---------------- */
function getUsers() { const v = load(K.users, []); return Array.isArray(v) ? v : []; }
function getSession() { return load(K.session, null); }
function currentUser() {
  const s = getSession();
  if (!s || !s.userId) return null;
  return getUsers().find(u => u && u.id === s.userId) || null;
}
const isAdmin = () => { const u = currentUser(); return !!(u && u.role === 'admin'); };

function doLogin(email, pass) {
  const users = getUsers();
  const u = users.find(x => x && String(x.email || '').toLowerCase() === String(email).toLowerCase().trim());
  if (!u || u.pass !== pass) return null;
  save(K.session, { userId: u.id, at: new Date().toISOString() });
  return u;
}
function doRegister(name, email, pass, role) {
  const users = getUsers();
  if (users.some(x => x && String(x.email || '').toLowerCase() === String(email).toLowerCase().trim())) return { error: 'An account with this email already exists.' };
  const u = { id: uid('U'), name: name.trim(), email: email.trim(), pass: pass, role: role === 'admin' ? 'admin' : 'teacher', createdAt: new Date().toISOString() };
  users.push(u); save(K.users, users);
  save(K.session, { userId: u.id, at: new Date().toISOString() });
  return { user: u };
}
function doLogout() {
  localStorage.removeItem(K.session);
  location.reload();
}
function showApp(user) {
  $('#authView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  $('#userName').textContent = user.name;
  $('#userEmail').textContent = user.email;
  $('#userRole').textContent = user.role;
  $('#userAvatar').textContent = (user.name || 'U').trim().charAt(0).toUpperCase();
  applyRoleGuards();
}
function applyRoleGuards() {
  const admin = isAdmin();
  const rc = $('#resetDataBtn');
  if (rc) { rc.disabled = !admin; rc.title = admin ? 'Reset demo data' : 'Only admins can reset demo data'; }
}

/* ---------------- Notifications core ---------------- */
function pushNotif(title, message, type) {
  const n = getNotifs();
  n.unshift({ id: uid('N'), title, message, type: type || 'info', time: new Date().toISOString(), read: false });
  setNotifs(n.slice(0, 200));
  renderNotifBadge(); renderNotifMini();
  if ($('#page-notifications').classList.contains('active')) renderNotificationsPage();
}
function unreadCount() { return getNotifs().filter(n => !n.read).length; }
function renderNotifBadge() {
  const c = unreadCount();
  const dot = $('#notifCount');
  dot.textContent = c > 99 ? '99+' : String(c);
  dot.classList.toggle('hidden', c === 0);
  const nav = $('#navNotifBadge');
  nav.textContent = dot.textContent;
  nav.classList.toggle('hidden', c === 0);
  const pend = getLeaves().filter(l => l.status === 'Pending').length;
  const lb = $('#navLeaveBadge');
  lb.textContent = String(pend);
  lb.classList.toggle('hidden', pend === 0);
}
function renderNotifMini() {
  const list = getNotifs().slice(0, 5);
  $('#notifListMini').innerHTML = list.length ? list.map(n =>
    '<div class="notif-item' + (n.read ? '' : ' unread') + '"><b>' + esc(n.title) + '</b> <span class="pill sim">sim</span><p>' + esc(n.message) + '</p><time>' + esc(fmtTime(n.time)) + '</time></div>'
  ).join('') : '<div class="empty">No notifications yet.</div>';
}

/* ---------------- Lookups & stats ---------------- */
function classById(id) { return getClasses().find(c => c.id === id); }
function classLabel(cls, section) {
  if (!cls) return '—';
  return cls.name + (section ? ' · ' + section : '');
}
function studentById(id) { return getStudents().find(s => s.id === id); }
function studentStats(studentId) {
  const recs = getAttendance().filter(a => a.studentId === studentId);
  const present = recs.filter(r => r.status === 'Present').length;
  const absent = recs.filter(r => r.status === 'Absent').length;
  const late = recs.filter(r => r.status === 'Late').length;
  const leave = recs.filter(r => r.status === 'Leave').length;
  const holiday = recs.filter(r => r.status === 'Holiday').length;
  const total = recs.length;
  const denom = total - holiday;
  const pct = denom > 0 ? Math.round(((present + late) / denom) * 1000) / 10 : 0;
  return { total, present, absent, late, leave, holiday, pct };
}
function latestRecordDate() {
  const a = getAttendance();
  if (!a.length) return todayISO();
  return a.map(r => r.date).sort().pop();
}
function recordedDatesAsc(limit) {
  const set = Array.from(new Set(getAttendance().map(r => r.date))).sort();
  return limit ? set.slice(-limit) : set;
}
function dayCounts(date) {
  const recs = getAttendance().filter(r => r.date === date);
  return {
    present: recs.filter(r => r.status === 'Present').length,
    absent: recs.filter(r => r.status === 'Absent').length,
    late: recs.filter(r => r.status === 'Late').length,
    leave: recs.filter(r => r.status === 'Leave').length,
    holiday: recs.filter(r => r.status === 'Holiday').length,
    total: recs.length
  };
}
function weekKey(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const onejan = new Date(dt.getFullYear(), 0, 1);
  const week = Math.ceil((((dt - onejan) / 864e5) + onejan.getDay() + 1) / 7);
  return dt.getFullYear() + '-W' + String(week).padStart(2, '0');
}
function attendancePct(list) {
  const h = list.filter(r => r.status === 'Holiday').length;
  const denom = list.length - h;
  if (!denom) return 0;
  const good = list.filter(r => r.status === 'Present' || r.status === 'Late').length;
  return Math.round((good / denom) * 1000) / 10;
}
function pillFor(status) {
  const s = String(status || '').toLowerCase();
  const cls = s === 'present' ? 'present' : s === 'absent' ? 'absent' : s === 'late' ? 'late' : s === 'leave' ? 'leave'
    : s === 'holiday' ? 'holiday'
    : s === 'pending' ? 'pending' : s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected'
    : s === 'active' ? 'active' : s === 'inactive' ? 'inactive' : s === 'admin' ? 'admin' : 'teacher';
  return '<span class="pill ' + cls + '">' + esc(status) + '</span>';
}

/* ---------------- Navigation ---------------- */
const PAGES = {
  dashboard: ['Dashboard', 'Daily statistics · class-wise attendance · alerts'],
  students: ['Student Management', 'Add, view, edit, search and filter students'],
  classes: ['Class Management', 'Classes 1–10, sections A/B/C and teacher assignment'],
  attendance: ['Daily Attendance', 'Mark Present / Absent / Late / Leave / Holiday + remarks'],
  reports: ['Attendance Report', 'Daily · weekly · monthly · yearly reports with CSV/print'],
  history: ['Student History', 'Date-wise history and attendance percentage'],
  leaves: ['Leave Management', 'Apply, approve and reject leaves'],
  analytics: ['Analytics & Insights', 'Trends, class-wise, monthly and yearly charts'],
  notifications: ['Notifications', 'Simulated parent alerts (no real SMS/email)']
};
let activePage = 'dashboard';
function showPage(name) {
  if (!PAGES[name]) return;
  activePage = name;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  $('#pageTitle').textContent = PAGES[name][0];
  $('#pageSub').textContent = PAGES[name][1];
  $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show');
  if (name === 'dashboard') renderDashboard();
  if (name === 'students') renderStudents();
  if (name === 'classes') renderClasses();
  if (name === 'attendance') renderAttendanceShell();
  if (name === 'reports') renderReports();
  if (name === 'history') renderHistory();
  if (name === 'leaves') renderLeaves();
  if (name === 'analytics') renderAnalytics();
  if (name === 'notifications') renderNotificationsPage();
  a11yTables();
  renderNotifBadge();
  window.scrollTo({ top: 0 });
}

/* ---------------- Charts registry ---------------- */
const charts = {};
function makeChart(id, config) {
  if (typeof Chart === 'undefined') return null;
  const el = document.getElementById(id);
  if (!el) return null;
  if (charts[id]) { try { charts[id].destroy(); } catch (e) {} delete charts[id]; }
  try { charts[id] = new Chart(el, config); return charts[id]; }
  catch (e) { return null; }
}
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function chartColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return { grid: dark ? '#223148' : '#e9eef5', tick: dark ? '#93a3bb' : '#64748b' };
}
const PALETTE = { present: '#16a34a', absent: '#dc2626', late: '#d97706', leave: '#0284c7', holiday: '#6d28d9' };

/* ---------------- Dashboard ---------------- */
function renderDashboard() {
  const students = getStudents();
  const active = students.filter(s => s.status === 'active');
  const classes = getClasses();
  const d = latestRecordDate();
  const c = dayCounts(d);
  const denom = c.total || 1;

  $('#dDateLabel').textContent = fmtDate(d) + (d === todayISO() ? ' (today)' : '');
  $('#dTotalStudents').textContent = students.length;
  $('#dActiveClasses').textContent = classes.length + ' classes · ' + active.length + ' active students';
  $('#dPresent').textContent = c.present;
  $('#dAbsent').textContent = c.absent;
  $('#dLate').textContent = c.late;
  $('#dLeave').textContent = c.leave;
  $('#dPresentPct').textContent = Math.round((c.present / denom) * 100) + '% of marked';
  $('#dAbsentPct').textContent = c.total ? ('of ' + c.total + ' marked') : 'no records';
  $('#dHoliday').textContent = c.holiday;

  const all = getAttendance();
  const tp = all.filter(r => r.status === 'Present').length;
  const overallPct = attendancePct(all);
  $('#dOverallPct').textContent = overallPct + '% overall attendance (excl. holidays)';

  // Recent attendance (latest 8 records by date desc)
  const sMap = Object.fromEntries(students.map(s => [s.id, s]));
  const recent = all.slice().sort((a, b) => (b.date + (b.updatedAt || '')).localeCompare(a.date + (a.updatedAt || ''))).slice(0, 8);
  $('#recentBody').innerHTML = recent.length ? recent.map(r => {
    const s = sMap[r.studentId]; const cls = classById(r.classId);
    return '<tr><td>' + esc(fmtDate(r.date)) + '</td><td>' + esc(s ? s.name : r.studentId) + '</td><td>' +
      esc(classLabel(cls, r.section)) + '</td><td>' + pillFor(r.status) + '</td></tr>';
  }).join('') : '<tr><td colspan="4"><div class="empty"><div class="big">🗂</div>No attendance records yet.<br />Go to Daily Attendance to mark the first day.</div></td></tr>';

  // Low attendance list
  const low = active.map(s => ({ s, st: studentStats(s.id) }))
    .filter(x => x.st.total >= 3 && x.st.pct < 75)
    .sort((a, b) => a.st.pct - b.st.pct).slice(0, 6);
  $('#dLowList').innerHTML = low.length ? low.map(x => {
    const cls = classById(x.s.classId);
    const lvl = x.st.pct < 60 ? 'low' : 'mid';
    return '<div style="padding:10px 0;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;gap:8px"><b>' +
      esc(x.s.name) + '</b><b>' + x.st.pct + '%</b></div><div class="muted small">' + esc(classLabel(cls, x.s.section)) +
      ' · ' + x.st.present + ' present / ' + x.st.total + ' days</div><div class="progress ' + lvl + '" style="margin-top:6px"><i style="width:' + x.st.pct + '%"></i></div></div>';
  }).join('') : '<div class="empty"><div class="big">✓</div>No students below 75%.<br />Attendance looks healthy.</div>';

  // Class-wise attendance (latest recorded day)
  const cw = {};
  all.filter(r => r.date === d).forEach(r => {
    const k = r.classId + '|' + r.section;
    cw[k] = cw[k] || { classId: r.classId, section: r.section, list: [] };
    cw[k].list.push(r);
  });
  const cwRows = Object.values(cw).sort((a, b) => (a.classId + a.section).localeCompare(b.classId + b.section));
  $('#dClassWise').innerHTML = cwRows.length ? '<div class="table-wrap" style="box-shadow:none"><table style="min-width:0"><thead><tr><th>Class</th><th>P</th><th>A</th><th>Lt</th><th>Lv</th><th>H</th><th>Present %</th></tr></thead><tbody>' +
    cwRows.map(r => {
      const n = { present: 0, absent: 0, late: 0, leave: 0, holiday: 0 };
      r.list.forEach(x => { n[x.status.toLowerCase()] = (n[x.status.toLowerCase()] || 0) + 1; });
      const pct = attendancePct(r.list);
      return '<tr><td>' + esc(classLabel(classById(r.classId), r.section)) + '</td><td>' + n.present + '</td><td>' + n.absent + '</td><td>' + n.late + '</td><td>' + n.leave + '</td><td>' + (n.holiday || 0) + '</td><td><b>' + pct + '%</b></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="empty">No class data.</div>';

  // Charts
  const cc = chartColors();
  const dates = recordedDatesAsc(7);
  makeChart('chTrend', {
    type: 'line',
    data: {
      labels: dates.map(fmtDate),
      datasets: [
        { label: 'Present', data: dates.map(dt => dayCounts(dt).present), borderColor: PALETTE.present, backgroundColor: PALETTE.present, tension: .35, fill: false },
        { label: 'Absent', data: dates.map(dt => dayCounts(dt).absent), borderColor: PALETTE.absent, backgroundColor: PALETTE.absent, tension: .35, fill: false },
        { label: 'Late', data: dates.map(dt => dayCounts(dt).late), borderColor: PALETTE.late, backgroundColor: PALETTE.late, tension: .35, fill: false },
        { label: 'Holiday', data: dates.map(dt => dayCounts(dt).holiday), borderColor: PALETTE.holiday, backgroundColor: PALETTE.holiday, tension: .35, fill: false }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { color: cc.grid }, ticks: { color: cc.tick, font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: cc.grid }, ticks: { color: cc.tick, precision: 0 } } } }
  });
  makeChart('chPresentAbsent', {
    type: 'doughnut',
    data: {
      labels: ['Present', 'Absent', 'Late', 'Leave', 'Holiday'],
      datasets: [{ data: [tp, all.filter(r => r.status === 'Absent').length, all.filter(r => r.status === 'Late').length, all.filter(r => r.status === 'Leave').length, all.filter(r => r.status === 'Holiday').length],
        backgroundColor: [PALETTE.present, PALETTE.absent, PALETTE.late, PALETTE.leave, PALETTE.holiday] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '62%' }
  });
}

/* ---------------- Students ---------------- */
function classOptions(selected) {
  return getClasses().map(c => '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
}
function refreshStudentClassFilters() {
  const sel = $('#stuClassFilter');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All classes</option>' + classOptions('');
  sel.value = cur;
  const rc = $('#repClass');
  if (rc) { const cv = rc.value; rc.innerHTML = '<option value="">All classes</option>' + classOptions(''); rc.value = cv; }
}
function filteredStudents() {
  const q = $('#stuSearch').value.trim().toLowerCase();
  const cf = $('#stuClassFilter').value;
  const sf = $('#stuStatusFilter').value;
  return getStudents().filter(s => {
    if (cf && s.classId !== cf) return false;
    if (sf && s.status !== sf) return false;
    if (q && !(s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || (s.parentName || '').toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || String(s.roll).includes(q))) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
}
function renderStudents() {
  refreshStudentClassFilters();
  const list = filteredStudents();
  $('#stuCountLabel').textContent = list.length + ' of ' + getStudents().length + ' students';
  $('#stuTableBody').innerHTML = list.length ? list.map(s => {
    const cls = classById(s.classId);
    return '<tr><td><b>' + esc(s.id) + '</b></td><td>' + esc(s.name) + '<br /><span class="muted small">Roll ' + esc(s.roll) + '</span></td><td>' +
      esc(classLabel(cls, s.section)) + '</td><td><b>' + esc(s.parentName || '—') + '</b><br /><span class="muted small">' + esc(s.parentPhone || '') + '</span></td><td class="muted small">' + esc(s.email) + '<br />' + esc(s.phone) + '<br />' + esc(s.address || '') + '</td><td>' +
      pillFor(s.status === 'active' ? 'active' : 'inactive') + '</td><td><div class="row-actions">' +
      '<button class="btn sm" data-act="view" data-id="' + esc(s.id) + '" type="button">View</button>' +
      '<button class="btn sm" data-act="edit" data-id="' + esc(s.id) + '" type="button">Edit</button>' +
      '<button class="btn sm danger" data-act="del" data-id="' + esc(s.id) + '" type="button">Delete</button>' +
      '</div></td></tr>';
  }).join('') : '<tr><td colspan="7"><div class="empty"><div class="big">◉</div>No students match the filters.<br />Try clearing search or add a new student.</div></td></tr>';
}
/* ---------------- Backup & restore (Task 2: JSON export/import) ---------------- */
function collectBackup() {
  return {
    app: 'AttendPro', task: 'WD-SCH-003', version: 1,
    exportedAt: new Date().toISOString(),
    students: getStudents(), classes: getClasses(), attendance: getAttendance(),
    leaves: getLeaves(), notifications: getNotifs(), users: getUsers()
  };
}
function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}
/* Validate an imported backup before accepting a single byte of it. */
function validateBackup(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errors: ['File is not a JSON object.'] };
  ['students', 'classes', 'attendance', 'leaves'].forEach(k => {
    if (obj[k] !== undefined && !Array.isArray(obj[k])) errors.push('"' + k + '" must be an array.');
  });
  (Array.isArray(obj.students) ? obj.students : []).forEach((s, i) => {
    if (!s || typeof s !== 'object') { errors.push('students[' + i + '] is not an object.'); return; }
    if (!s.id && !s.name) errors.push('students[' + i + '] needs an id or a name.');
  });
  (Array.isArray(obj.attendance) ? obj.attendance : []).forEach((a, i) => {
    if (!a || typeof a !== 'object') { errors.push('attendance[' + i + '] is not an object.'); return; }
    if (!a.studentId || !a.date) errors.push('attendance[' + i + '] needs studentId and date.');
    else if (a.status && !VALID_STATUSES.includes(a.status)) errors.push('attendance[' + i + '] has unknown status "' + a.status + '".');
  });
  (Array.isArray(obj.leaves) ? obj.leaves : []).forEach((l, i) => {
    if (!l || typeof l !== 'object') { errors.push('leaves[' + i + '] is not an object.'); return; }
    if (l.status && !VALID_LEAVE.includes(l.status)) errors.push('leaves[' + i + '] has unknown status "' + l.status + '".');
  });
  return { ok: errors.length === 0, errors: errors.slice(0, 12) };
}
function openDataModal() {
  let bytes = 0;
  Object.values(K).forEach(k => { bytes += (localStorage.getItem(k) || '').length; });
  const kb = (bytes / 1024).toFixed(1);
  openModal('Data & backup',
    '<p class="muted small">All application data lives in your browser (<b>localStorage</b>, ~' + esc(kb) + ' KB). ' +
    'Export a JSON backup before clearing anything. Imports are validated first — invalid files are rejected without touching your data.</p>' +
    '<div class="form-grid">' +
    '<div><label class="lbl">Backup</label><button class="btn" id="dExport" type="button" style="width:100%">⇩ Export JSON</button></div>' +
    '<div><label class="lbl">Restore</label><button class="btn" id="dImport" type="button" style="width:100%">⇧ Import JSON…</button><div class="field-err" id="dImpErr"></div></div>' +
    '<div><label class="lbl">Demo data</label><button class="btn" id="dReset" type="button" style="width:100%">↺ Reset demo data</button></div>' +
    '<div><label class="lbl">Danger zone</label><button class="btn danger" id="dClear" type="button" style="width:100%">Clear all data</button></div>' +
    '</div><input type="file" id="dFile" accept="application/json,.json" class="hidden" />',
    '<button class="btn primary" id="mDone" type="button">Done</button>');
  $('#mDone').addEventListener('click', closeModal);
  $('#dExport').addEventListener('click', () => {
    downloadJSON('attendpro-backup-' + todayISO() + '.json', collectBackup());
    toast('Backup exported', 'Keep the JSON file somewhere safe.', 'success');
  });
  $('#dReset').addEventListener('click', async () => { closeModal(); await resetDemoData(); });
  $('#dClear').addEventListener('click', async () => {
    if (!isAdmin()) { toast('Admin only', 'Only admins can clear all data.', 'warn'); return; }
    const ok = await confirmAction('Clear all data?', 'Students, classes, attendance, leaves and notifications will be removed. Your login accounts are kept. The app will show empty states.', 'Clear everything');
    if (!ok) return;
    [K.students, K.classes, K.attendance, K.leaves, K.notifs].forEach(k => localStorage.removeItem(k));
    closeModal(); renderAll();
    toast('Data cleared', 'Empty states are shown. Use Reset to reload demo data.', 'success');
  });
  $('#dImport').addEventListener('click', () => $('#dFile').click());
  $('#dFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const btn = $('#dImport');
    btn.disabled = true; btn.textContent = 'Validating…';
    const rd = new FileReader();
    rd.onload = async () => {
      let obj = null;
      try { obj = JSON.parse(rd.result); } catch (err) { obj = null; }
      const v = validateBackup(obj);
      btn.disabled = false; btn.textContent = '⇧ Import JSON…';
      $('#dImpErr').textContent = '';
      if (!v.ok) { $('#dImpErr').textContent = 'Invalid backup: ' + (v.errors[0] || 'unknown error.'); return; }
      const ok = await confirmAction('Import backup?', 'Current data will be replaced by the backup from ' + (obj.exportedAt ? fmtTime(obj.exportedAt) : 'unknown date') + '.', 'Import');
      if (!ok) return;
      if (Array.isArray(obj.students)) setStudents(obj.students);
      if (Array.isArray(obj.classes)) setClasses(obj.classes);
      if (Array.isArray(obj.attendance)) setAttendance(obj.attendance);
      if (Array.isArray(obj.leaves)) setLeaves(obj.leaves);
      if (Array.isArray(obj.notifications)) setNotifs(obj.notifications);
      if (Array.isArray(obj.users) && obj.users.length) save(K.users, obj.users);
      migrateData();
      closeModal(); renderAll();
      pushNotif('Backup restored', 'Data was restored from an imported JSON backup.', 'success');
      toast('Backup restored', 'All views re-rendered from import.', 'success');
    };
    rd.onerror = () => { btn.disabled = false; btn.textContent = '⇧ Import JSON…'; $('#dImpErr').textContent = 'Could not read that file.'; };
    rd.readAsText(f);
    e.target.value = '';
  });
}
/* nextStudentId() lives in the storage section (monotonic counter). */
function openStudentModal(existing) {
  const s = existing || { id: nextStudentId(), name: '', classId: (getClasses()[0] || {}).id || '', section: '', roll: '', parentName: '', parentPhone: '', address: '', email: '', phone: '', status: 'active' };
  const cls = classById(s.classId);
  const sections = cls ? cls.sections : [];
  openModal(existing ? 'Edit student' : 'Add student',
    '<div class="form-grid">' +
    '<div><label class="lbl">Student ID</label><input class="input" id="fStuId" value="' + esc(s.id) + '" disabled /></div>' +
    '<div><label class="lbl" for="fStuRoll">Roll number *</label><input class="input" id="fStuRoll" type="number" min="1" value="' + esc(s.roll) + '" /><div class="field-err" id="eRoll"></div></div>' +
    '<div class="full"><label class="lbl" for="fStuName">Full name *</label><input class="input" id="fStuName" value="' + esc(s.name) + '" placeholder="e.g. Aarav Sharma" /><div class="field-err" id="eName"></div></div>' +
    '<div><label class="lbl" for="fStuClass">Class *</label><select class="input" id="fStuClass">' + classOptions(s.classId) + '</select><div class="field-err" id="eClass"></div></div>' +
    '<div><label class="lbl" for="fStuSec">Section *</label><select class="input" id="fStuSec">' + sections.map(x => '<option' + (x === s.section ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select><div class="field-err" id="eSec"></div></div>' +
    '<div><label class="lbl" for="fStuParent">Parent name *</label><input class="input" id="fStuParent" value="' + esc(s.parentName || '') + '" placeholder="e.g. Rajesh Sharma" /><div class="field-err" id="eParent"></div></div>' +
    '<div><label class="lbl" for="fStuPPhone">Parent phone *</label><input class="input" id="fStuPPhone" value="' + esc(s.parentPhone || '') + '" placeholder="10-digit mobile" /><div class="field-err" id="ePPhone"></div></div>' +
    '<div class="full"><label class="lbl" for="fStuAddr">Address *</label><input class="input" id="fStuAddr" value="' + esc(s.address || '') + '" placeholder="House, street, city" /><div class="field-err" id="eAddr"></div></div>' +
    '<div><label class="lbl" for="fStuEmail">Email</label><input class="input" id="fStuEmail" type="email" value="' + esc(s.email) + '" /><div class="field-err" id="eEmail"></div></div>' +
    '<div><label class="lbl" for="fStuPhone">Phone</label><input class="input" id="fStuPhone" value="' + esc(s.phone) + '" placeholder="10-digit mobile" /><div class="field-err" id="ePhone"></div></div>' +
    '<div class="full"><label class="lbl" for="fStuStatus">Status</label><select class="input" id="fStuStatus"><option value="active"' + (s.status === 'active' ? ' selected' : '') + '>active</option><option value="inactive"' + (s.status === 'inactive' ? ' selected' : '') + '>inactive</option></select></div>' +
    '</div>',
    '<button class="btn" id="mCancel" type="button">Cancel</button>' +
    '<button class="btn primary" id="mSaveStu" type="button">' + (existing ? 'Save changes' : 'Add student') + '</button>');

  $('#fStuClass').addEventListener('change', (e) => {
    const c = classById(e.target.value);
    $('#fStuSec').innerHTML = (c ? c.sections : []).map(x => '<option>' + esc(x) + '</option>').join('');
  });
  $('#mCancel').addEventListener('click', closeModal);
  $('#mSaveStu').addEventListener('click', () => {
    let ok = true;
    const setE = (id, msg) => { $(id).textContent = msg || ''; if (msg) ok = false; };
    const name = $('#fStuName').value.trim();
    const classId = $('#fStuClass').value;
    const section = $('#fStuSec').value;
    const roll = Number($('#fStuRoll').value);
    const parentName = $('#fStuParent').value.trim();
    const parentPhone = $('#fStuPPhone').value.trim();
    const address = $('#fStuAddr').value.trim();
    const email = $('#fStuEmail').value.trim();
    const phone = $('#fStuPhone').value.trim();
    const status = $('#fStuStatus').value;
    setE('#eName', name.length < 3 ? 'Enter the full name (min 3 characters).' : '');
    setE('#eClass', !classId ? 'Select a class.' : '');
    setE('#eSec', !section ? 'Select a section.' : '');
    setE('#eRoll', !(roll >= 1) ? 'Enter a valid roll number.' : '');
    setE('#eParent', parentName.length < 3 ? 'Enter the parent name.' : '');
    setE('#ePPhone', !isPhone(parentPhone) ? 'Enter a valid 10-digit parent phone.' : '');
    setE('#eAddr', address.length < 5 ? 'Enter the address (min 5 characters).' : '');
    setE('#eEmail', email && !isEmail(email) ? 'Enter a valid email address.' : '');
    setE('#ePhone', phone && !isPhone(phone) ? 'Enter a valid 10-digit phone number.' : '');
    if (!ok) return;
    const all = getStudents();
    if (email && all.some(x => (x.email || '').toLowerCase() === email.toLowerCase() && x.id !== s.id)) { setE('#eEmail', 'This email is already used by another student.'); return; }
    if (all.some(x => x.classId === classId && x.section === section && Number(x.roll) === roll && x.id !== s.id)) { setE('#eRoll', 'Roll number already exists in this class + section.'); return; }

    if (existing) {
      const i = all.findIndex(x => x.id === s.id);
      all[i] = { ...all[i], name, classId, section, roll, parentName, parentPhone, address, email, phone, status };
      setStudents(all);
      pushNotif('Student updated', name + ' (' + s.id + ') was updated.', 'info');
      toast('Student updated', name, 'success');
    } else {
      all.push({ id: s.id, name, classId, section, roll, parentName, parentPhone, address, email, phone, status, createdAt: new Date().toISOString() });
      setStudents(all);
      pushNotif('Student added', name + ' was added to ' + classLabel(classById(classId), section) + '.', 'success');
      toast('Student added', name, 'success');
    }
    closeModal(); renderStudents(); renderNotifBadge();
  });
}
function openStudentView(id) {
  const s = studentById(id);
  if (!s) return;
  const cls = classById(s.classId);
  const st = studentStats(id);
  openModal('Student profile · ' + s.name,
    '<dl class="kv"><dt>Student ID</dt><dd>' + esc(s.id) + '</dd>' +
    '<dt>Class</dt><dd>' + esc(classLabel(cls, s.section)) + ' (ID ' + esc(s.classId) + ')</dd>' +
    '<dt>Roll number</dt><dd>' + esc(s.roll) + '</dd>' +
    '<dt>Parent name</dt><dd>' + esc(s.parentName || '—') + '</dd>' +
    '<dt>Parent phone</dt><dd>' + esc(s.parentPhone || '—') + '</dd>' +
    '<dt>Address</dt><dd>' + esc(s.address || '—') + '</dd>' +
    '<dt>Email</dt><dd>' + esc(s.email || '—') + '</dd>' +
    '<dt>Phone</dt><dd>' + esc(s.phone || '—') + '</dd>' +
    '<dt>Status</dt><dd>' + pillFor(s.status) + '</dd>' +
    '<dt>Attendance</dt><dd>' + st.present + ' present · ' + st.absent + ' absent · ' + st.late + ' late · ' + st.leave + ' leave · ' + st.holiday + ' holiday (' + st.pct + '%, excl. holidays)</dd></dl>',
    '<button class="btn" id="mClose" type="button">Close</button>' +
    '<button class="btn primary" id="mHist" type="button">Open history</button>');
  $('#mClose').addEventListener('click', closeModal);
  $('#mHist').addEventListener('click', () => { closeModal(); $('#histStudent').value = id; showPage('history'); });
}

/* ---------------- Classes ---------------- */
function renderClasses() {
  const grid = $('#classGrid');
  const students = getStudents();
  const list = getClasses();
  grid.innerHTML = list.length ? list.map(c => {
    const count = students.filter(s => s.classId === c.id).length;
    const secs = c.sections.map(sec => {
      const n = students.filter(s => s.classId === c.id && s.section === sec).length;
      return '<span class="pill active" style="margin:2px">' + esc(sec) + ' · ' + n + '</span>';
    }).join(' ');
    return '<div class="card"><div class="card-head"><h3>' + esc(c.name) + '</h3><span class="muted small">ID ' + esc(c.id) + '</span></div>' +
      '<div class="muted small">Class teacher: <b style="color:var(--text)">' + esc(c.teacher) + '</b></div>' +
      '<div class="muted small">' + esc(c.room || '') + ' · strength ' + esc(c.capacity || '—') + ' · ' + count + ' enrolled</div>' +
      '<div style="margin:10px 0">' + secs + '</div>' +
      '<div class="row-actions"><button class="btn sm" data-cact="edit" data-id="' + esc(c.id) + '" type="button">Edit</button>' +
      '<button class="btn sm" data-cact="att" data-id="' + esc(c.id) + '" type="button">Take attendance</button>' +
      '<button class="btn sm danger" data-cact="del" data-id="' + esc(c.id) + '" type="button">Delete</button></div></div>';
  }).join('') : '<div class="card"><div class="empty"><div class="big">▤</div>No classes yet. Create the first class to get started.</div></div>';
}
function openClassModal(existing) {
  if (existing && !isAdmin()) { toast('Admin only', 'Only admins can edit classes.', 'warn'); return; }
  if (!existing && !isAdmin()) { toast('Admin only', 'Only admins can create classes.', 'warn'); return; }
  const c = existing || { id: 'CLS' + String(getClasses().length + 1).padStart(2, '0'), name: '', sections: ['A'], teacher: '', room: '', capacity: 40 };
  openModal(existing ? 'Edit class' : 'New class',
    '<div class="form-grid">' +
    '<div><label class="lbl">Class ID</label><input class="input" value="' + esc(c.id) + '" disabled /></div>' +
    '<div><label class="lbl" for="fClsCap">Strength (seats) *</label><input class="input" id="fClsCap" type="number" min="1" value="' + esc(c.capacity) + '" /><div class="field-err" id="eCap"></div></div>' +
    '<div class="full"><label class="lbl" for="fClsName">Class name * (e.g. Class 1 … Class 10 — custom allowed)</label><input class="input" id="fClsName" list="clsList" value="' + esc(c.name) + '" placeholder="e.g. Class 8" /><datalist id="clsList"><option>Class 1</option><option>Class 2</option><option>Class 3</option><option>Class 4</option><option>Class 5</option><option>Class 6</option><option>Class 7</option><option>Class 8</option><option>Class 9</option><option>Class 10</option></datalist><div class="field-err" id="eCName"></div></div>' +
    '<div class="full"><label class="lbl" for="fClsSec">Sections * (comma separated — A, B, C suggested)</label><input class="input" id="fClsSec" value="' + esc(c.sections.join(', ')) + '" placeholder="A, B, C" /><div class="field-err" id="eCSec"></div></div>' +
    '<div class="full"><label class="lbl" for="fClsTeacher">Class teacher *</label><input class="input" id="fClsTeacher" value="' + esc(c.teacher) + '" placeholder="e.g. Meera Iyer" /><div class="field-err" id="eCTeacher"></div></div>' +
    '<div class="full"><label class="lbl" for="fClsRoom">Room</label><input class="input" id="fClsRoom" value="' + esc(c.room || '') + '" placeholder="e.g. Block B · R-201" /></div>' +
    '</div>',
    '<button class="btn" id="mCancel" type="button">Cancel</button>' +
    '<button class="btn primary" id="mSaveCls" type="button">' + (existing ? 'Save changes' : 'Create class') + '</button>');
  $('#mCancel').addEventListener('click', closeModal);
  $('#mSaveCls').addEventListener('click', () => {
    let ok = true;
    const setE = (id, m) => { $(id).textContent = m || ''; if (m) ok = false; };
    const name = $('#fClsName').value.trim();
    const secs = $('#fClsSec').value.split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
    const teacher = $('#fClsTeacher').value.trim();
    const room = $('#fClsRoom').value.trim();
    const cap = Number($('#fClsCap').value);
    setE('#eCName', name.length < 2 ? 'Enter a class name.' : '');
    setE('#eCSec', !secs.length ? 'Add at least one section.' : (!secs.every(x => /^[A-Z0-9]{1,2}$/.test(x)) ? 'Sections must be 1–2 letters (e.g. A, B).' : ''));
    setE('#eCTeacher', teacher.length < 3 ? 'Assign a class teacher.' : '');
    setE('#eCap', !(cap >= 1) ? 'Enter a valid strength.' : '');
    if (!ok) return;
    const uniqSecs = Array.from(new Set(secs));
    const all = getClasses();
    if (existing) {
      const removed = existing.sections.filter(x => !uniqSecs.includes(x));
      if (removed.length) {
        const affected = getStudents().filter(s => s.classId === existing.id && removed.includes(s.section));
        if (affected.length) { toast('Cannot remove section', affected.length + ' student(s) are still in section(s): ' + removed.join(', '), 'error'); return; }
        const attAffected = getAttendance().some(a => a.classId === existing.id && removed.includes(a.section));
        if (attAffected) { toast('Cannot remove section', 'Attendance records exist for removed section(s).', 'error'); return; }
      }
      Object.assign(existing, { name, sections: uniqSecs, teacher, room, capacity: cap });
      setClasses(all);
      pushNotif('Class updated', name + ' was updated.', 'info');
      toast('Class updated', name, 'success');
    } else {
      all.push({ id: c.id, name, sections: uniqSecs, teacher, room, capacity: cap });
      setClasses(all);
      pushNotif('Class created', name + ' (' + uniqSecs.join(', ') + ') was created.', 'success');
      toast('Class created', name, 'success');
    }
    closeModal(); renderClasses();
  });
}

/* ---------------- Daily attendance ---------------- */
const attState = { classId: '', section: '', date: todayISO(), marks: {}, remarks: {}, search: '' };
function renderAttendanceShell() {
  const cls = getClasses();
  if (!cls.length) {
    $('#attList').innerHTML = '<div class="card"><div class="empty">No classes found. Create a class first.</div></div>';
    return;
  }
  if (!attState.classId || !cls.some(c => c.id === attState.classId)) {
    attState.classId = cls[0].id;
    attState.section = cls[0].sections[0] || '';
  }
  const sel = $('#attClass');
  sel.innerHTML = cls.map(c => '<option value="' + esc(c.id) + '"' + (c.id === attState.classId ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
  syncAttSections();
  if (!$('#attDate').value) $('#attDate').value = attState.date;
  else attState.date = $('#attDate').value || todayISO();
  loadAttMarks();
  renderAttList();
}
function syncAttSections() {
  const c = classById(attState.classId);
  const secs = c ? c.sections : [];
  if (!secs.includes(attState.section)) attState.section = secs[0] || '';
  $('#attSection').innerHTML = secs.map(s => '<option' + (s === attState.section ? ' selected' : '') + '>' + esc(s) + '</option>').join('');
}
function loadAttMarks() {
  attState.marks = {};
  attState.remarks = {};
  getAttendance().filter(a => a.classId === attState.classId && a.section === attState.section && a.date === attState.date)
    .forEach(a => { attState.marks[a.studentId] = a.status; attState.remarks[a.studentId] = a.note || ''; });
}
function attRoster() {
  const q = attState.search.trim().toLowerCase();
  return getStudents()
    .filter(s => s.classId === attState.classId && s.section === attState.section && s.status === 'active')
    .filter(s => !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    .sort((a, b) => a.roll - b.roll || a.name.localeCompare(b.name));
}
function renderAttList() {
  const roster = attRoster();
  const marks = attState.marks;
  const counts = { Present: 0, Absent: 0, Late: 0, Leave: 0, Holiday: 0, Unmarked: 0 };
  roster.forEach(s => { const m = marks[s.id]; if (m) counts[m] = (counts[m] || 0) + 1; else counts.Unmarked++; });
  $('#attSummary').textContent = roster.length + ' students · ' + counts.Present + ' present · ' + counts.Absent + ' absent · ' + counts.Late + ' late · ' + counts.Leave + ' leave · ' + counts.Holiday + ' holiday · ' + counts.Unmarked + ' unmarked';
  const existing = getAttendance().some(a => a.classId === attState.classId && a.section === attState.section && a.date === attState.date);
  $('#attStatusMsg').innerHTML = existing
    ? '<span class="pill approved">Saved</span> <span class="muted">Attendance for this class/section/date already exists — editing will <b>update</b> it (no duplicates per student + class + date).</span>'
    : '<span class="muted">No attendance saved yet for this selection. Mark Present / Absent / Late / Leave / Holiday, add remarks, then Save.</span>';
  $('#attSaveBtn').textContent = existing ? 'Update attendance' : 'Save attendance';
  $('#attList').innerHTML = roster.length ? roster.map(s =>
    '<div class="att-row" style="flex-wrap:wrap"><div class="avatar" style="width:32px;height:32px;font-size:12px">' + esc(s.name.charAt(0)) + '</div>' +
    '<div class="who"><b>' + esc(s.name) + '</b><span>' + esc(s.id) + ' · Roll ' + esc(s.roll) + '</span></div>' +
    '<div style="flex:1 1 100%"><div class="seg" data-stu="' + esc(s.id) + '">' +
    ['Present', 'Absent', 'Late', 'Leave', 'Holiday'].map(st =>
      '<button type="button" data-s="' + st + '" class="' + (marks[s.id] === st ? 'on' : '') + '">' + st + '</button>').join('') +
    '</div><input class="remark-input" data-remark="' + esc(s.id) + '" placeholder="Remarks (optional) — e.g. late bus, sick note…" value="' + esc((attState.remarks || {})[s.id] || '') + '" /></div></div>'
  ).join('') : '<div class="card"><div class="empty"><div class="big">✔</div>No active students in this class + section.<br />Add students or pick another section.</div></div>';
}
async function saveAttendance() {
  const roster = attRoster();
  // use full roster ignoring search for saving? Save only visible? Better save full class-section roster using current marks; unmarked in search-hidden keep previous marks.
  const full = getStudents().filter(s => s.classId === attState.classId && s.section === attState.section && s.status === 'active');
  const unmarked = full.filter(s => !attState.marks[s.id]);
  if (!full.length) { toast('Nothing to save', 'No active students in this selection.', 'warn'); return; }
  if (unmarked.length) {
    const ok = await confirmAction('Save with unmarked students?', unmarked.length + ' student(s) have no status. They will be left unmarked (no record). Continue?', 'Save anyway');
    if (!ok) return;
  }
  const all = getAttendance();
  // Prevent duplicates for same student + class + date (section may change -> update).
  const byKey = new Map(all.map((a, i) => [a.studentId + '|' + a.classId + '|' + a.date, i]));
  const me = (currentUser() || {}).name || 'Unknown';
  let created = 0, updated = 0;
  Object.entries(attState.marks).forEach(([sid, status]) => {
    const stu = studentById(sid);
    if (!stu || stu.classId !== attState.classId || stu.section !== attState.section) return;
    const remark = ((attState.remarks || {})[sid] || '').trim();
    const key = sid + '|' + attState.classId + '|' + attState.date;
    if (byKey.has(key)) {
      const rec = all[byKey.get(key)];
      if (rec.status !== status || rec.section !== attState.section || (rec.note || '') !== remark) {
        rec.status = status; rec.section = attState.section; rec.note = remark;
        rec.markedBy = me; rec.updatedAt = new Date().toISOString(); updated++;
      }
    } else {
      all.push({ id: uid('ATT'), studentId: sid, classId: attState.classId, section: attState.section, date: attState.date, status, note: remark, markedBy: me, updatedAt: new Date().toISOString() });
      created++;
    }
  });
  setAttendance(all);
  const cls = classById(attState.classId);
  pushNotif('Attendance saved (simulated parent alerts)', classLabel(cls, attState.section) + ' · ' + fmtDate(attState.date) + ' — ' + created + ' new, ' + updated + ' updated. Parent SMS simulated, no real messages sent.', 'success');
  // low attendance check
  full.forEach(s => {
    const st = studentStats(s.id);
    if (st.total >= 3 && st.pct < 75) pushNotif('Absenteeism alert (simulated parent SMS)', 'SIMULATED SMS to ' + (s.parentName || 'parent') + ' (' + (s.parentPhone || '—') + '): ' + s.name + ' is at ' + st.pct + '% attendance. No real message sent.', 'warning');
  });
  toast('Attendance saved', created + ' new · ' + updated + ' updated. No duplicates created.', 'success');
  renderAttList(); renderNotifBadge();
}

/* ---------------- Reports ---------------- */
function reportPeriodDates() {
  const p = ($('#repPeriod') || {}).value || 'daily';
  if (p === 'daily') return { label: 'Daily · ' + fmtDate($('#repDate').value), test: (d) => !$('#repDate').value || d === $('#repDate').value };
  if (p === 'weekly') {
    const anchor = $('#repDate').value || latestRecordDate();
    const [y, m, d] = anchor.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = (dt.getDay() + 6) % 7;
    dt.setDate(dt.getDate() - day);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const t = new Date(dt); t.setDate(dt.getDate() + i);
      days.push(t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'));
    }
    return { label: 'Weekly · ' + fmtDate(days[0]) + ' → ' + fmtDate(days[6]), test: (x) => days.includes(x) };
  }
  if (p === 'monthly') {
    const mv = $('#repMonth').value || latestRecordDate().slice(0, 7);
    return { label: 'Monthly · ' + mv, test: (x) => x.slice(0, 7) === mv };
  }
  const yv = $('#repYear').value || latestRecordDate().slice(0, 4);
  return { label: 'Yearly · ' + yv, test: (x) => x.slice(0, 4) === yv };
}
function filteredReports() {
  const per = reportPeriodDates();
  const c = $('#repClass').value;
  const sec = $('#repSection').value;
  const st = $('#repStatus').value;
  const q = $('#repSearch').value.trim().toLowerCase();
  const sMap = Object.fromEntries(getStudents().map(s => [s.id, s]));
  return getAttendance().filter(a => {
    if (!per.test(a.date)) return false;
    if (c && a.classId !== c) return false;
    if (sec && a.section !== sec) return false;
    if (st && a.status !== st) return false;
    if (q) {
      const s = sMap[a.studentId];
      const hay = ((s ? s.name + ' ' + s.id : a.studentId)).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));
}
function renderReports() {
  if (!$('#repDate').value) $('#repDate').value = latestRecordDate();
  const yrs = Array.from(new Set(getAttendance().map(a => a.date.slice(0, 4)))).sort();
  const ry = $('#repYear');
  if (!ry.options.length) ry.innerHTML = yrs.map(y => '<option>' + y + '</option>').join('');
  if (!ry.value) ry.value = latestRecordDate().slice(0, 4);
  if (!$('#repMonth').value) $('#repMonth').value = latestRecordDate().slice(0, 7);
  const per = ($('#repPeriod') || {}).value || 'daily';
  $('#repDate').classList.toggle('hidden', per === 'monthly' || per === 'yearly');
  $('#repMonth').classList.toggle('hidden', per !== 'monthly');
  $('#repYear').classList.toggle('hidden', per !== 'yearly');
  const rc = $('#repClass');
  if (!rc.options.length || rc.options.length <= 1) rc.innerHTML = '<option value="">All classes</option>' + classOptions('');
  const c = classById(rc.value);
  const rs = $('#repSection');
  const cur = rs.value;
  rs.innerHTML = '<option value="">All sections</option>' + ((c ? c.sections : Array.from(new Set(getClasses().flatMap(x => x.sections))))).map(s => '<option' + (s === cur ? ' selected' : '') + '>' + esc(s) + '</option>').join('');
  const rows = filteredReports();
  $('#repPeriodLabel').textContent = reportPeriodDates().label + ' · class / date / student / month filters apply';
  $('#repPresent').textContent = rows.filter(r => r.status === 'Present').length;
  $('#repAbsent').textContent = rows.filter(r => r.status === 'Absent').length;
  $('#repLate').textContent = rows.filter(r => r.status === 'Late').length;
  $('#repLeave').textContent = rows.filter(r => r.status === 'Leave').length;
  $('#repHoliday').textContent = rows.filter(r => r.status === 'Holiday').length;
  $('#repCount').textContent = rows.length + ' record(s) found';
  const sMap = Object.fromEntries(getStudents().map(s => [s.id, s]));
  $('#repTableBody').innerHTML = rows.slice(0, 400).map(r => {
    const s = sMap[r.studentId]; const cls = classById(r.classId);
    return '<tr><td>' + esc(fmtDate(r.date)) + '</td><td>' + esc(s ? s.name + ' (' + s.id + ')' : r.studentId) +
      '</td><td>' + esc(cls ? cls.name : r.classId) + '</td><td>' + esc(r.section) + '</td><td>' + pillFor(r.status) +
      '</td><td class="muted small">' + esc(r.note || '—') + '</td></tr>';
  }).join('') || '<tr><td colspan="6"><div class="empty"><div class="big">≣</div>No records match these filters.</div></td></tr>';
  renderSummaryTab();
}
function renderSummaryTab() {
  const atts = getAttendance();
  // class-wise
  const keys = {};
  atts.forEach(a => {
    const k = a.classId + '|' + a.section;
    keys[k] = keys[k] || { classId: a.classId, section: a.section, total: 0, present: 0, absent: 0, late: 0, leave: 0, holiday: 0, list: [] };
    keys[k].total++; keys[k][a.status.toLowerCase()] = (keys[k][a.status.toLowerCase()] || 0) + 1; keys[k].list.push(a);
  });
  const rows = Object.values(keys).sort((a, b) => (a.classId + a.section).localeCompare(b.classId + b.section));
  $('#sumClassTable').innerHTML = rows.length ? '<div class="table-wrap" style="box-shadow:none"><table style="min-width:0"><thead><tr><th>Class</th><th>Records</th><th>Present %</th></tr></thead><tbody>' +
    rows.map(r => {
      const pct = attendancePct(r.list || []);
      return '<tr><td>' + esc(classLabel(classById(r.classId), r.section)) + '</td><td>' + r.total + '</td><td><b>' + pct + '%</b><div class="progress ' + (pct < 75 ? 'low' : pct < 85 ? 'mid' : 'high') + '"><i style="width:' + pct + '%"></i></div></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="empty">No data.</div>';
  // low students
  const low = getStudents().filter(s => s.status === 'active').map(s => ({ s, st: studentStats(s.id) }))
    .filter(x => x.st.total >= 3 && x.st.pct < 75).sort((a, b) => a.st.pct - b.st.pct);
  $('#sumLowTable').innerHTML = low.length ? low.map(x =>
    '<div style="padding:8px 0;border-bottom:1px solid var(--border)"><b>' + esc(x.s.name) + '</b> <span class="muted small">' + esc(x.s.id) + ' · ' + esc(classLabel(classById(x.s.classId), x.s.section)) + '</span><div style="float:right"><b>' + x.st.pct + '%</b></div></div>'
  ).join('') : '<div class="empty">No students below 75%.</div>';
  // monthly
  const byM = {};
  atts.forEach(a => {
    const m = a.date.slice(0, 7);
    byM[m] = byM[m] || { list: [] };
    byM[m].list.push(a);
  });
  const months = Object.keys(byM).sort().slice(-6);
  $('#sumMonthTable').innerHTML = months.length ? '<div class="table-wrap" style="box-shadow:none"><table style="min-width:0"><thead><tr><th>Month</th><th>Records</th><th>Present %</th></tr></thead><tbody>' +
    months.map(m => {
      const pct = attendancePct(byM[m].list);
      return '<tr><td>' + esc(m) + '</td><td>' + byM[m].list.length + '</td><td><b>' + pct + '%</b></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="empty">No data.</div>';
  // yearly
  const byY = {};
  atts.forEach(a => {
    const y = a.date.slice(0, 4);
    byY[y] = byY[y] || { list: [] };
    byY[y].list.push(a);
  });
  const years = Object.keys(byY).sort();
  $('#sumYearTable').innerHTML = years.length ? '<div class="table-wrap" style="box-shadow:none"><table style="min-width:0"><thead><tr><th>Year</th><th>Records</th><th>Present %</th></tr></thead><tbody>' +
    years.map(y => {
      const pct = attendancePct(byY[y].list);
      return '<tr><td>' + esc(y) + '</td><td>' + byY[y].list.length + '</td><td><b>' + pct + '%</b></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="empty">No data.</div>';
}

/* ---------------- History ---------------- */
function renderHistory() {
  const sel = $('#histStudent');
  const students = getStudents().slice().sort((a, b) => a.name.localeCompare(b.name));
  if (!sel.options.length) {
    sel.innerHTML = students.map(s => '<option value="' + esc(s.id) + '">' + esc(s.name + ' · ' + s.id) + '</option>').join('');
  } else {
    const cur = sel.value;
    sel.innerHTML = students.map(s => '<option value="' + esc(s.id) + '"' + (s.id === cur ? ' selected' : '') + '>' + esc(s.name + ' · ' + s.id) + '</option>').join('');
    if (!sel.value && students.length) sel.value = students[0].id;
  }
  const s = studentById(sel.value) || students[0];
  if (!s) { $('#histBody').innerHTML = '<tr><td colspan="4"><div class="empty">No students yet.</div></td></tr>'; return; }
  sel.value = s.id;
  const st = studentStats(s.id);
  const cls = classById(s.classId);
  $('#histName').textContent = s.name + ' · ' + s.id;
  $('#histMeta').textContent = classLabel(cls, s.section) + ' · Roll No. ' + s.roll + ' · Parent: ' + (s.parentName || '—') + ' (' + (s.parentPhone || '—') + ') · ' + (s.address || '');
  $('#hPresent').textContent = st.present; $('#hAbsent').textContent = st.absent;
  $('#hLate').textContent = st.late; $('#hLeave').textContent = st.leave;
  $('#hHoliday').textContent = st.holiday;
  $('#hPct').textContent = st.pct + '% attendance (excl. holidays)';
  $('#hBar').style.width = st.pct + '%';
  $('#hBarWrap').className = 'progress ' + (st.pct < 75 ? 'low' : st.pct < 85 ? 'mid' : 'high');
  const recs = getAttendance().filter(a => a.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
  $('#histBody').innerHTML = recs.length ? recs.map(r =>
    '<tr><td>' + esc(fmtDate(r.date)) + '</td><td>' + pillFor(r.status) + '</td><td>' + esc(classLabel(classById(r.classId), r.section)) + '</td><td class="muted small">' + esc(r.note || '—') + '</td></tr>'
  ).join('') : '<tr><td colspan="4"><div class="empty"><div class="big">◷</div>No attendance records for this student yet.</div></td></tr>';
}

/* ---------------- Leaves ---------------- */
function renderLeaves() {
  const f = $('#leaveStatusFilter').value;
  const sMap = Object.fromEntries(getStudents().map(s => [s.id, s]));
  const list = getLeaves().filter(l => !f || l.status === f)
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  $('#leaveCount').textContent = list.length + ' of ' + getLeaves().length + ' requests';
  $('#leaveBody').innerHTML = list.length ? list.map(l => {
    const s = sMap[l.studentId];
    const cls = s ? classById(s.classId) : null;
    return '<tr><td><span class="muted small">' + esc(l.id) + '</span><br /><b>' + esc(s ? s.name : l.studentId) + '</b><br /><span class="muted small">Student ID ' + esc(l.studentId) + (s ? ' · ' + esc(classLabel(cls, s.section)) : '') + ' · ' + esc(l.type || 'General') + '</span></td>' +
      '<td><b>From:</b> ' + esc(fmtDate(l.startDate)) + '<br /><b>To:</b> ' + esc(fmtDate(l.endDate)) + '</td>' +
      '<td class="muted small" style="max-width:240px">' + esc(l.reason) + '</td><td>' + pillFor(l.status) + ' <span class="pill sim">sim</span></td>' +
      '<td class="muted small">' + esc(fmtTime(l.submittedAt)) + (l.decidedBy ? '<br />by ' + esc(l.decidedBy) : '') + '</td>' +
      '<td><div class="row-actions">' +
      (l.status === 'Pending'
        ? '<button class="btn sm success" data-lact="approve" data-id="' + esc(l.id) + '" type="button">Approve</button>' +
          '<button class="btn sm danger" data-lact="reject" data-id="' + esc(l.id) + '" type="button">Reject</button>'
        : '<span class="muted small">Decided</span>') +
      '<button class="btn sm" data-lact="del" data-id="' + esc(l.id) + '" type="button">Delete</button>' +
      '</div></td></tr>';
  }).join('') : '<tr><td colspan="6"><div class="empty"><div class="big">✉</div>No leave requests found.</div></td></tr>';
  renderNotifBadge();
}
function openLeaveModal() {
  const students = getStudents().filter(s => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  openModal('New leave request',
    '<div class="form-grid">' +
    '<div class="full"><label class="lbl" for="fLvStu">Student ID *</label><select class="input" id="fLvStu">' + students.map(s => '<option value="' + esc(s.id) + '">' + esc(s.name + ' · ' + s.id) + '</option>').join('') + '</select></div>' +
    '<div><label class="lbl" for="fLvType">Leave type</label><select class="input" id="fLvType"><option>Sick</option><option>Casual</option><option>Family</option><option>Emergency</option><option>Other</option></select></div>' +
    '<div><label class="lbl" for="fLvStart">From date * (start)</label><input class="input" id="fLvStart" type="date" value="' + todayISO() + '" /><div class="field-err" id="eLvDate"></div></div>' +
    '<div><label class="lbl" for="fLvEnd">To date * (end)</label><input class="input" id="fLvEnd" type="date" value="' + todayISO() + '" /></div>' +
    '<div><label class="lbl" for="fLvStatus">Status</label><select class="input" id="fLvStatus"><option>Pending</option><option>Approved</option><option>Rejected</option></select></div>' +
    '<div class="full"><label class="lbl" for="fLvReason">Reason *</label><textarea class="input" id="fLvReason" placeholder="Explain the reason for leave…"></textarea><div class="field-err" id="eLvReason"></div></div>' +
    '</div>',
    '<button class="btn" id="mCancel" type="button">Cancel</button><button class="btn primary" id="mSaveLv" type="button">Submit request</button>');
  $('#mCancel').addEventListener('click', closeModal);
  $('#mSaveLv').addEventListener('click', () => {
    let ok = true;
    const setE = (id, m) => { $(id).textContent = m || ''; if (m) ok = false; };
    const studentId = $('#fLvStu').value;
    const type = $('#fLvType').value;
    const startDate = $('#fLvStart').value;
    const endDate = $('#fLvEnd').value;
    const reason = $('#fLvReason').value.trim();
    const status = $('#fLvStatus').value;
    setE('#eLvDate', !startDate || !endDate ? 'Select start and end dates.' : (endDate < startDate ? 'End date cannot be before start date.' : ''));
    setE('#eLvReason', reason.length < 5 ? 'Please give a reason (min 5 characters).' : '');
    if (!ok || !studentId) return;
    const leaves = getLeaves();
    leaves.unshift({ id: uid('LV'), studentId, type, startDate, endDate, reason, status, submittedAt: new Date().toISOString(), decidedBy: status === 'Pending' ? '' : ((currentUser() || {}).name || ''), decidedAt: status === 'Pending' ? '' : new Date().toISOString() });
    setLeaves(leaves);
    const s = studentById(studentId);
    pushNotif('Leave ' + status.toLowerCase() + ' (simulated parent update)', (s ? s.name + ' (' + studentId + ')' : studentId) + ' · ' + type + ' leave From ' + fmtDate(startDate) + ' To ' + fmtDate(endDate) + '. Parent notified (simulated).', status === 'Pending' ? 'info' : status === 'Approved' ? 'success' : 'warning');
    toast('Leave request saved', (s ? s.name : '') + ' · ' + status, 'success');
    closeModal(); renderLeaves();
  });
}

/* ---------------- Analytics ---------------- */
function renderAnalytics() {
  const n = Number($('#anaDays').value || 14);
  const dates = recordedDatesAsc(n);
  const cc = chartColors();
  const perDay = dates.map(dt => dayCounts(dt));
  makeChart('chTrend2', {
    type: 'line',
    data: {
      labels: dates.map(fmtDate),
      datasets: [
        { label: 'Present', data: perDay.map(d => d.present), borderColor: PALETTE.present, backgroundColor: 'rgba(22,163,74,.12)', fill: true, tension: .35 },
        { label: 'Absent', data: perDay.map(d => d.absent), borderColor: PALETTE.absent, backgroundColor: PALETTE.absent, tension: .35, fill: false },
        { label: 'Late', data: perDay.map(d => d.late), borderColor: PALETTE.late, backgroundColor: PALETTE.late, tension: .35, fill: false },
        { label: 'Leave', data: perDay.map(d => d.leave), borderColor: PALETTE.leave, backgroundColor: PALETTE.leave, tension: .35, fill: false },
        { label: 'Holiday', data: perDay.map(d => d.holiday), borderColor: PALETTE.holiday, backgroundColor: PALETTE.holiday, tension: .35, fill: false }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { color: cc.grid }, ticks: { color: cc.tick, font: { size: 10 } } }, y: { beginAtZero: true, ticks: { color: cc.tick, precision: 0 }, grid: { color: cc.grid } } } }
  });
  const inRange = getAttendance().filter(a => dates.includes(a.date));
  makeChart('chDonut', {
    type: 'doughnut',
    data: { labels: ['Present', 'Absent', 'Late', 'Leave', 'Holiday'],
      datasets: [{ data: ['Present', 'Absent', 'Late', 'Leave', 'Holiday'].map(s => inRange.filter(r => r.status === s).length),
        backgroundColor: [PALETTE.present, PALETTE.absent, PALETTE.late, PALETTE.leave, PALETTE.holiday] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '60%' }
  });
  // class-wise %
  const byClass = {};
  inRange.forEach(a => {
    const k = a.classId + '|' + a.section;
    byClass[k] = byClass[k] || { label: classLabel(classById(a.classId), a.section), list: [] };
    byClass[k].list.push(a);
  });
  const ck = Object.values(byClass);
  makeChart('chClassBar', {
    type: 'bar',
    data: { labels: ck.map(x => x.label), datasets: [{ label: 'Attendance % (excl. holidays)', data: ck.map(x => attendancePct(x.list)), backgroundColor: '#2563eb', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: cc.tick, font: { size: 10 } }, grid: { display: false } }, y: { min: 0, max: 100, ticks: { color: cc.tick }, grid: { color: cc.grid } } } }
  });
  // monthly
  const byM = {};
  getAttendance().forEach(a => {
    const m = a.date.slice(0, 7);
    byM[m] = byM[m] || { list: [] };
    byM[m].list.push(a);
  });
  const months = Object.keys(byM).sort().slice(-6);
  makeChart('chMonthly', {
    type: 'bar',
    data: { labels: months, datasets: [{ label: 'Present %', data: months.map(m => attendancePct(byM[m].list)), backgroundColor: '#0284c7', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: cc.tick }, grid: { display: false } }, y: { min: 0, max: 100, ticks: { color: cc.tick }, grid: { color: cc.grid } } } }
  });
  // weekly report (present % by week)
  const byW = {};
  getAttendance().forEach(a => {
    const w = weekKey(a.date);
    byW[w] = byW[w] || { list: [] };
    byW[w].list.push(a);
  });
  const weeks = Object.keys(byW).sort().slice(-8);
  makeChart('chWeekly', {
    type: 'bar',
    data: { labels: weeks, datasets: [{ label: 'Present %', data: weeks.map(w => attendancePct(byW[w].list)), backgroundColor: '#1d4ed8', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: cc.tick, font: { size: 10 } }, grid: { display: false } }, y: { min: 0, max: 100, ticks: { color: cc.tick }, grid: { color: cc.grid } } } }
  });
  // yearly trends (present % by year)
  const byY = {};
  getAttendance().forEach(a => {
    const y = a.date.slice(0, 4);
    byY[y] = byY[y] || { list: [] };
    byY[y].list.push(a);
  });
  const years = Object.keys(byY).sort();
  makeChart('chYearly', {
    type: 'bar',
    data: { labels: years, datasets: [{ label: 'Present %', data: years.map(y => attendancePct(byY[y].list)), backgroundColor: '#1e40af', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: cc.tick }, grid: { display: false } }, y: { min: 0, max: 100, ticks: { color: cc.tick }, grid: { color: cc.grid } } } }
  });
  $('#anaNote').textContent = 'Daily trend + weekly, monthly & yearly views · computed from ' + inRange.length + ' record(s) across ' + dates.length + ' recorded day(s). Excludes holidays from %.';
}

/* ---------------- Notifications page ---------------- */
function renderNotificationsPage() {
  const list = getNotifs().slice().sort((a, b) => String(b.time).localeCompare(String(a.time)));
  $('#notifFullCount').textContent = list.length + ' notification(s) · ' + unreadCount() + ' unread';
  $('#notifFullList').innerHTML = list.length ? list.map(n =>
    '<div class="notif-item' + (n.read ? '' : ' unread') + '" style="border:1px solid var(--border);border-radius:9px;margin-bottom:8px">' +
    '<div style="display:flex;gap:8px;align-items:center"><b style="flex:1">' + esc(n.title) + '</b><span class="pill sim">simulated</span>' +
    (n.read ? '' : '<button class="btn sm" data-nact="read" data-id="' + esc(n.id) + '" type="button">Mark read</button>') + '</div>' +
    '<p>' + esc(n.message) + '</p><time>' + esc(fmtTime(n.time)) + ' · ' + esc(n.type) + ' · simulated, no real SMS/email sent</time></div>'
  ).join('') : '<div class="empty"><div class="big">♪</div>No notifications.<br />Attendance saves, leave updates and alerts will appear here.</div>';
  renderNotifBadge(); renderNotifMini();
}

/* ---------------- Render all ---------------- */
function a11yTables() { $$('th').forEach(th => th.setAttribute('scope', 'col')); }
function renderAll() {
  renderNotifBadge(); renderNotifMini();
  if (activePage === 'dashboard') renderDashboard();
  if (activePage === 'students') renderStudents();
  if (activePage === 'classes') renderClasses();
  if (activePage === 'attendance') renderAttendanceShell();
  if (activePage === 'reports') renderReports();
  if (activePage === 'history') renderHistory();
  if (activePage === 'leaves') renderLeaves();
  if (activePage === 'analytics') renderAnalytics();
  if (activePage === 'notifications') renderNotificationsPage();
  a11yTables();
}

/* ---------------- Events ---------------- */
function bindEvents() {
  // Auth tabs
  $('#tabLogin').addEventListener('click', () => {
    $('#tabLogin').classList.add('active'); $('#tabRegister').classList.remove('active');
    $('#loginForm').classList.remove('hidden'); $('#registerForm').classList.add('hidden');
  });
  $('#tabRegister').addEventListener('click', () => {
    $('#tabRegister').classList.add('active'); $('#tabLogin').classList.remove('active');
    $('#registerForm').classList.remove('hidden'); $('#loginForm').classList.add('hidden');
  });
  $$('[data-fill]').forEach(b => b.addEventListener('click', () => {
    $('#tabLogin').click();
    if (b.dataset.fill === 'admin') { $('#loginEmail').value = 'admin@attendpro.com'; $('#loginPassword').value = 'admin123'; }
    else { $('#loginEmail').value = 'teacher@attendpro.com'; $('#loginPassword').value = 'teacher123'; }
    $('#loginError').textContent = '';
  }));
  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    $('#loginEmailErr').textContent = ''; $('#loginPassErr').textContent = ''; $('#loginError').textContent = '';
    const em = $('#loginEmail').value.trim(), pw = $('#loginPassword').value;
    let ok = true;
    if (!isEmail(em)) { $('#loginEmailErr').textContent = 'Enter a valid email.'; ok = false; }
    if (!pw) { $('#loginPassErr').textContent = 'Enter your password.'; ok = false; }
    if (!ok) return;
    const u = doLogin(em, pw);
    if (!u) { $('#loginError').textContent = 'Invalid email or password. Use the demo credentials below.'; return; }
    showApp(u); renderAll();
    toast('Welcome back', u.name + ' (' + u.role + ')', 'success');
    pushNotif('Login', u.name + ' signed in as ' + u.role + '.', 'info');
  });
  $('#registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    $('#regNameErr').textContent = ''; $('#regEmailErr').textContent = ''; $('#regPassErr').textContent = ''; $('#regError').textContent = '';
    const nm = $('#regName').value.trim(), em = $('#regEmail').value.trim(), pw = $('#regPassword').value, role = $('#regRole').value;
    let ok = true;
    if (nm.length < 3) { $('#regNameErr').textContent = 'Enter your full name.'; ok = false; }
    if (!isEmail(em)) { $('#regEmailErr').textContent = 'Enter a valid email.'; ok = false; }
    if (pw.length < 6) { $('#regPassErr').textContent = 'Password must be at least 6 characters.'; ok = false; }
    if (!ok) return;
    const r = doRegister(nm, em, pw, role);
    if (r.error) { $('#regError').textContent = r.error; return; }
    showApp(r.user); renderAll();
    toast('Account created', r.user.name + ' (' + r.user.role + ')', 'success');
  });

  // Sidebar / nav
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
  $$('[data-goto]').forEach(b => b.addEventListener('click', () => showPage(b.dataset.goto)));
  $('#hamburger').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); });
  $('#scrim').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); });
  $('#logoutBtn').addEventListener('click', async () => {
    const ok = await confirmAction('Logout?', 'You will be signed out of this demo session.', 'Logout');
    if (ok) doLogout();
  });
  $('#resetDataBtn').addEventListener('click', () => {
    if (!isAdmin()) { toast('Admin only', 'Only admins can reset demo data.', 'warn'); return; }
    resetDemoData();
  });

  // Theme
  const dataBtn = $('#dataBtn');
  if (dataBtn) dataBtn.addEventListener('click', openDataModal);
  $('#themeBtn').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', cur);
    localStorage.setItem(K.theme, cur);
    renderAll();
  });

  // Notifications dropdown
  $('#notifBtn').addEventListener('click', (e) => { e.stopPropagation(); renderNotifMini(); $('#notifMenu').classList.toggle('open'); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) $('#notifMenu').classList.remove('open');
  });
  $('#gotoNotifBtn').addEventListener('click', () => { $('#notifMenu').classList.remove('open'); showPage('notifications'); });

  // Modal + confirm
  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  $('#confirmNo').addEventListener('click', () => closeConfirm(false));
  $('#confirmYes').addEventListener('click', () => closeConfirm(true));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeConfirm(false); $('#notifMenu').classList.remove('open'); } });

  // Students
  $('#stuSearch').addEventListener('input', renderStudents);
  $('#stuClassFilter').addEventListener('change', renderStudents);
  $('#stuStatusFilter').addEventListener('change', renderStudents);
  $('#addStudentBtn').addEventListener('click', () => {
    if (!getClasses().length) { toast('No classes', 'Create a class before adding students.', 'warn'); return; }
    openStudentModal(null);
  });
  $('#stuExportBtn').addEventListener('click', () => {
    const rows = filteredStudents().map(s => ({ ID: s.id, Name: s.name, Class: (classById(s.classId) || {}).name || s.classId, Section: s.section, RollNumber: s.roll, ParentName: s.parentName || '', ParentPhone: s.parentPhone || '', Address: s.address || '', Email: s.email || '', Phone: s.phone || '', Status: s.status }));
    downloadCSV('students.csv', rows);
  });
  $('#stuTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id, act = btn.dataset.act;
    if (act === 'view') openStudentView(id);
    if (act === 'edit') { const s = studentById(id); if (s) openStudentModal(s); }
    if (act === 'del') {
      if (!isAdmin()) { toast('Admin only', 'Only admins can delete students.', 'warn'); return; }
      const s = studentById(id);
      const ok = await confirmAction('Delete student?', (s ? s.name + ' (' + s.id + ')' : id) + ' and their attendance history will be removed. Continue?', 'Delete');
      if (!ok) return;
      setStudents(getStudents().filter(x => x.id !== id));
      setAttendance(getAttendance().filter(a => a.studentId !== id));
      setLeaves(getLeaves().filter(l => l.studentId !== id));
      pushNotif('Student deleted', (s ? s.name : id) + ' was removed.', 'warning');
      toast('Student deleted', s ? s.name : id, 'success');
      renderStudents();
    }
  });

  // Classes
  $('#addClassBtn').addEventListener('click', () => openClassModal(null));
  $('#classGrid').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-cact]');
    if (!btn) return;
    const id = btn.dataset.id, act = btn.dataset.cact;
    const c = classById(id);
    if (act === 'edit') openClassModal(c);
    if (act === 'att') {
      attState.classId = id; attState.section = (c.sections || [])[0] || ''; attState.date = todayISO();
      $('#attDate').value = attState.date;
      showPage('attendance');
    }
    if (act === 'del') {
      if (!isAdmin()) { toast('Admin only', 'Only admins can delete classes.', 'warn'); return; }
      const n = getStudents().filter(s => s.classId === id).length;
      const ok = await confirmAction('Delete class?', (c ? c.name : id) + (n ? ' has ' + n + ' student(s). ' : ' ') + 'Students, attendance and related data for this class will be handled: students will be removed. Continue?', 'Delete class');
      if (!ok) return;
      const stuIds = new Set(getStudents().filter(s => s.classId === id).map(s => s.id));
      setStudents(getStudents().filter(s => s.classId !== id));
      setAttendance(getAttendance().filter(a => a.classId !== id));
      setLeaves(getLeaves().filter(l => !stuIds.has(l.studentId)));
      setClasses(getClasses().filter(x => x.id !== id));
      pushNotif('Class deleted', (c ? c.name : id) + ' was deleted.', 'warning');
      toast('Class deleted', c ? c.name : '', 'success');
      renderClasses();
    }
  });

  // Attendance
  $('#attClass').addEventListener('change', (e) => { attState.classId = e.target.value; syncAttSections(); loadAttMarks(); renderAttList(); });
  $('#attSection').addEventListener('change', (e) => { attState.section = e.target.value; loadAttMarks(); renderAttList(); });
  $('#attDate').addEventListener('change', (e) => { attState.date = e.target.value || todayISO(); loadAttMarks(); renderAttList(); });
  $('#attSearch').addEventListener('input', (e) => { attState.search = e.target.value; renderAttList(); });
  $('#attList').addEventListener('click', (e) => {
    const b = e.target.closest('.seg button');
    if (!b) return;
    const wrap = b.closest('.seg');
    const sid = wrap.dataset.stu;
    attState.marks[sid] = b.dataset.s;
    wrap.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    renderAttListCountsOnly();
  });
  $('#attList').addEventListener('input', (e) => {
    const inp = e.target.closest('input[data-remark]');
    if (!inp) return;
    attState.remarks[inp.dataset.remark] = inp.value;
  });
  const bulkMark = (status) => {
    attRoster().forEach(s => { attState.marks[s.id] = status; });
    renderAttList();
    toast('Bulk marked', 'All listed students set to ' + status + '. Add remarks if needed, then Save.', 'success');
  };
  $('#markAllPresentBtn').addEventListener('click', () => bulkMark('Present'));
  $('#markAllAbsentBtn').addEventListener('click', () => bulkMark('Absent'));
  $('#markAllLeaveBtn').addEventListener('click', () => bulkMark('Leave'));
  $('#markAllHolidayBtn').addEventListener('click', () => bulkMark('Holiday'));
  $('#attResetBtn').addEventListener('click', () => { attState.marks = {}; attState.remarks = {}; attState.search = ''; $('#attSearch').value = ''; renderAttList(); });
  $('#attSaveBtn').addEventListener('click', saveAttendance);
  const attNotify = $('#attNotifyBtn');
  if (attNotify) attNotify.addEventListener('click', () => {
    const roster = attRoster();
    const absentees = roster.filter(s => (attState.marks[s.id] || '') === 'Absent');
    const targets = absentees.length ? absentees : roster.filter(s => { const st = studentStats(s.id); return st.total >= 3 && st.pct < 75; }).slice(0, 10);
    if (!targets.length) { toast('No alerts needed', 'No absentees or low-attendance students in this selection.', 'success'); return; }
    targets.forEach(s => pushNotif('Absenteeism alert (simulated parent SMS)', 'SIMULATED SMS to ' + (s.parentName || 'parent') + ' (' + (s.parentPhone || '—') + '): ' + s.name + ' (' + s.id + ') was marked Absent on ' + fmtDate(attState.date) + '. No real message sent.', 'warning'));
    toast('Simulated alerts sent', targets.length + ' parent SMS simulated (no real delivery).', 'success');
  });

  // Reports
  $$('[data-rtab]').forEach(t => t.addEventListener('click', () => {
    $$('[data-rtab]').forEach(x => x.classList.toggle('active', x === t));
    $('#rtab-daily').classList.toggle('hidden', t.dataset.rtab !== 'daily');
    $('#rtab-summary').classList.toggle('hidden', t.dataset.rtab !== 'summary');
  }));
  ['repDate', 'repMonth', 'repYear', 'repPeriod', 'repClass', 'repSection', 'repStatus'].forEach(id => { const el = $('#' + id); if (el) el.addEventListener('change', renderReports); });
  $('#repSearch').addEventListener('input', renderReports);
  $('#repClass').addEventListener('change', () => {
    const c = classById($('#repClass').value);
    $('#repSection').innerHTML = '<option value="">All sections</option>' + ((c ? c.sections : Array.from(new Set(getClasses().flatMap(x => x.sections))))).map(s => '<option>' + esc(s) + '</option>').join('');
  });
  $('#repExportCsvBtn').addEventListener('click', () => {
    const sMap = Object.fromEntries(getStudents().map(s => [s.id, s]));
    downloadCSV('attendance-report.csv', filteredReports().map(r => {
      const s = sMap[r.studentId];
      return { ID: r.id, Date: r.date, StudentID: r.studentId, Student: s ? s.name : '', ClassID: r.classId, Class: (classById(r.classId) || {}).name || r.classId, Section: r.section, Status: r.status, Remarks: r.note || '' };
    }));
  });
  $('#repPrintBtn').addEventListener('click', () => window.print());
  $('#sumExportBtn').addEventListener('click', () => {
    const atts = getAttendance(); const keys = {};
    atts.forEach(a => { const k = a.classId + '|' + a.section; keys[k] = keys[k] || { Class: classLabel(classById(a.classId), a.section), Records: 0, Present: 0, Absent: 0, Late: 0, Leave: 0, Holiday: 0 }; keys[k].Records++; keys[k][a.status] = (keys[k][a.status] || 0) + 1; });
    downloadCSV('class-summary.csv', Object.values(keys));
  });
  $('#sumPrintBtn').addEventListener('click', () => window.print());

  // History
  $('#histStudent').addEventListener('change', renderHistory);
  $('#histExportBtn').addEventListener('click', () => {
    const id = $('#histStudent').value;
    const s = studentById(id);
    downloadCSV('history-' + id + '.csv', getAttendance().filter(a => a.studentId === id).sort((a, b) => a.date.localeCompare(b.date)).map(r => ({ ID: r.id, Date: r.date, StudentID: id, Student: s ? s.name : '', Status: r.status, ClassID: r.classId, Class: classLabel(classById(r.classId), r.section), Remarks: r.note || '' })));
  });
  $('#histPrintBtn').addEventListener('click', () => window.print());

  // Leaves
  $('#leaveStatusFilter').addEventListener('change', renderLeaves);
  $('#addLeaveBtn').addEventListener('click', openLeaveModal);
  $('#leaveBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-lact]');
    if (!btn) return;
    const id = btn.dataset.id, act = btn.dataset.lact;
    const leaves = getLeaves();
    const l = leaves.find(x => x.id === id);
    if (!l) return;
    const s = studentById(l.studentId);
    if (act === 'approve' || act === 'reject') {
      l.status = act === 'approve' ? 'Approved' : 'Rejected';
      l.decidedBy = (currentUser() || {}).name || 'Staff';
      l.decidedAt = new Date().toISOString();
      setLeaves(leaves);
      pushNotif('Leave ' + l.status.toLowerCase() + ' (simulated parent update)', (s ? s.name + ' (' + l.studentId + ')' : l.studentId) + ' · From ' + fmtDate(l.startDate) + ' To ' + fmtDate(l.endDate) + ' was ' + l.status.toLowerCase() + '. Parent notified (simulated).', act === 'approve' ? 'success' : 'warning');
      toast('Leave ' + l.status.toLowerCase(), s ? s.name : '', act === 'approve' ? 'success' : 'warn');
      renderLeaves();
    }
    if (act === 'del') {
      const ok = await confirmAction('Delete leave request?', 'This leave request will be permanently removed.', 'Delete');
      if (!ok) return;
      setLeaves(getLeaves().filter(x => x.id !== id));
      toast('Leave deleted', '', 'success');
      renderLeaves();
    }
  });

  // Analytics
  $('#anaDays').addEventListener('change', renderAnalytics);

  // Notifications page
  const simBtn = $('#simulateParentBtn');
  if (simBtn) simBtn.addEventListener('click', () => {
    const low = getStudents().filter(s => s.status === 'active').map(s => ({ s, st: studentStats(s.id) }))
      .filter(x => x.st.total >= 3 && x.st.pct < 80).sort((a, b) => a.st.pct - b.st.pct).slice(0, 5);
    if (!low.length) { pushNotif('Parent alerts (simulated)', 'Attendance looks healthy — no absenteeism alerts needed. (Simulated, no real SMS sent.)', 'success'); }
    else low.forEach(x => pushNotif('Absenteeism alert (simulated parent SMS)', 'SIMULATED SMS to ' + (x.s.parentName || 'parent') + ' (' + (x.s.parentPhone || '—') + '): ' + x.s.name + ' is at ' + x.st.pct + '% attendance. No real message sent.', 'warning'));
    const pend = getLeaves().filter(l => l.status === 'Pending').slice(0, 3);
    pend.forEach(l => {
      const s = studentById(l.studentId);
      pushNotif('Leave update (simulated parent email)', 'SIMULATED email to parent of ' + (s ? s.name : l.studentId) + ': leave From ' + fmtDate(l.startDate) + ' is ' + l.status + '. No real email sent.', 'info');
    });
    toast('Simulated notifications', 'Parent SMS/email simulated — no real delivery.', 'success');
    renderNotificationsPage();
  });
  $('#markAllReadBtn').addEventListener('click', () => {
    setNotifs(getNotifs().map(n => ({ ...n, read: true })));
    renderNotificationsPage();
  });
  $('#clearNotifBtn').addEventListener('click', async () => {
    const ok = await confirmAction('Clear notifications?', 'All notifications will be removed.', 'Clear all');
    if (!ok) return;
    setNotifs([]); renderNotificationsPage();
  });
  $('#notifFullList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-nact]');
    if (!btn) return;
    setNotifs(getNotifs().map(n => n.id === btn.dataset.id ? { ...n, read: true } : n));
    renderNotificationsPage();
  });
}
function renderAttListCountsOnly() {
  const roster = attRoster();
  const marks = attState.marks;
  const counts = { Present: 0, Absent: 0, Late: 0, Leave: 0, Holiday: 0, Unmarked: 0 };
  roster.forEach(s => { const m = marks[s.id]; if (m) counts[m]++; else counts.Unmarked++; });
  $('#attSummary').textContent = roster.length + ' students · ' + counts.Present + ' present · ' + counts.Absent + ' absent · ' + counts.Late + ' late · ' + counts.Leave + ' leave · ' + counts.Holiday + ' holiday · ' + counts.Unmarked + ' unmarked';
}

/* ---------------- Init ---------------- */
function init() {
  if (window.__sasInit) return;
  window.__sasInit = true;
  seedIfNeeded();
  migrateData();
  // Accessibility: table header scope for screen readers.
  a11yTables();
  const theme = localStorage.getItem(K.theme) || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  bindEvents();
  const u = currentUser();
  if (u) { showApp(u); renderAll(); }
  attState.date = todayISO();
  const ad = $('#attDate'); if (ad) ad.value = attState.date;
}
document.addEventListener('DOMContentLoaded', init);
