/* ============================================================
   Toodledoo - Frontend MVP with Badges + Local Challenges
   Storage: localStorage under STORAGE_KEY
============================================================ */

const STORAGE_KEY = 'TRACKER_STATE';
const DEFAULT_THEME = {
  main: '#ff6fa3',
  accent1: '#1a2b5f',
  accent2: '#ffd60a',
};

const todayKey = () => new Date().toISOString().slice(0, 10);

// ---------- Badge Definitions ----------
const BADGES = [
  { id: 'first-log',     emoji: '🌱', name: 'First Step',     desc: 'Log progress for the first time' },
  { id: 'goal-hit',      emoji: '🎯', name: 'Goal Hit',       desc: 'Reach a daily goal' },
  { id: 'goal-x5',       emoji: '⭐',  name: 'High Five',      desc: 'Hit any goal 5 times' },
  { id: 'goal-x25',      emoji: '🌟', name: 'Consistent',     desc: 'Hit any goal 25 times' },
  { id: 'goal-x100',     emoji: '💫', name: 'Centurion',      desc: 'Hit any goal 100 times' },
  { id: 'streak-3',      emoji: '🔥', name: '3-Day Streak',   desc: '3 days in a row on one goal' },
  { id: 'streak-7',      emoji: '🔥', name: 'Week Warrior',   desc: '7-day streak on one goal' },
  { id: 'streak-30',     emoji: '🏆', name: 'Monthly Master', desc: '30-day streak on one goal' },
  { id: 'variety-3',     emoji: '🎨', name: 'Multi-tasker',   desc: 'Have 3 active goals' },
  { id: 'variety-5',     emoji: '🎭', name: 'Renaissance',    desc: 'Have 5 active goals' },
  { id: 'early-bird',    emoji: '🌅', name: 'Early Bird',     desc: 'Log before 8 AM' },
  { id: 'night-owl',     emoji: '🦉', name: 'Night Owl',      desc: 'Log after 10 PM' },
  { id: 'overachiever',  emoji: '🚀', name: 'Overachiever',   desc: 'Log 2× your daily goal' },
  { id: 'perfect-day',   emoji: '✨', name: 'Perfect Day',    desc: 'Hit every goal in one day (3+ goals)' },
  { id: 'challenger',    emoji: '⚔️', name: 'Challenger',     desc: 'Create your first challenge' },
  { id: 'champion',      emoji: '👑', name: 'Champion',       desc: 'Finish a challenge in 1st place' },
];

// ---------- State ----------
let state = loadState();
let editingId = null;
let editingChallengeId = null;
let logTargetId = null;
let reminderTimers = {};
let deferredInstallPrompt = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        trackers: parsed.trackers || [],
        theme: { ...DEFAULT_THEME, ...(parsed.theme || {}) },
        notifGranted: parsed.notifGranted || false,
        badges: parsed.badges || {},
        stats: parsed.stats || { totalGoalHits: 0 },
        challenges: parsed.challenges || [],
        profile: parsed.profile || { username: '', id: uid() },
        friends: parsed.friends || [], // [{ username, addedAt }]
      };
    }
  } catch (_) {}
  return {
    trackers: [],
    theme: { ...DEFAULT_THEME },
    notifGranted: false,
    badges: {},
    stats: { totalGoalHits: 0 },
    challenges: [],
    profile: { username: '', id: uid() },
    friends: [],
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- Theme ----------
function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty('--color-main', state.theme.main);
  root.style.setProperty('--color-accent1', state.theme.accent1);
  root.style.setProperty('--color-accent2', state.theme.accent2);
  root.style.setProperty('--color-main-soft', hexWithAlpha(state.theme.main, 0.25));
  root.style.setProperty('--text', state.theme.accent1);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', state.theme.main);
}

function hexWithAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------- Views ----------
function showView(name) {
  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
  const v = document.getElementById('view-' + name);
  if (v) v.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ---------- Trackers ----------
function todayProgress(tracker) {
  return (tracker.log && tracker.log[todayKey()]) || 0;
}

function computeStreak(tracker) {
  if (!tracker.log) return 0;
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    const v = tracker.log[key] || 0;
    if (v >= tracker.goal) streak++;
    else if (i === 0) {
      // today not yet hit — start checking from yesterday
    } else break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function renderTrackers() {
  const list = document.getElementById('tracker-list');
  const empty = document.getElementById('empty-state');
  list.innerHTML = '';

  if (state.trackers.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
  }

  state.trackers.forEach((t) => {
    list.appendChild(buildTrackerCard(t, false));
  });

  const totalGoals = state.trackers.length;
  const hit = state.trackers.filter((t) => todayProgress(t) >= t.goal).length;
  const summary = document.getElementById('banner-summary');
  if (totalGoals === 0) {
    summary.textContent = 'Add a goal to start logging your progress.';
  } else {
    summary.textContent = `${hit} of ${totalGoals} goal${totalGoals === 1 ? '' : 's'} hit today.`;
  }

  renderRecentBadges();
}

function buildTrackerCard(t, readonly) {
  const today = todayProgress(t);
  const pct = Math.min(100, (today / t.goal) * 100);
  const done = today >= t.goal;
  const streak = computeStreak(t);

  const card = document.createElement('div');
  card.className = 'tracker-card';
  card.innerHTML = `
    <div class="tracker-head">
      <div class="tracker-icon">${escapeHtml(t.icon || '⭐')}</div>
      <div class="tracker-info">
        <p class="tracker-name">${escapeHtml(t.name)}${streak >= 3 ? ` <span title="Streak">🔥${streak}</span>` : ''}</p>
        <p class="tracker-goal-text">${formatNum(today)} / ${formatNum(t.goal)} ${escapeHtml(t.unit)}</p>
      </div>
    </div>
    <div class="tracker-progress-bar">
      <div class="tracker-progress-fill ${done ? 'done' : ''}" style="width:${pct}%"></div>
    </div>
    <p class="tracker-percent ${done ? 'done' : ''}">${done ? '🎉 Goal reached!' : Math.round(pct) + '%'}</p>
    ${
      readonly
        ? ''
        : `
    <div class="tracker-actions">
      <button class="btn primary" data-act="log" data-id="${t.id}">+ Log</button>
      <button class="btn ghost" data-act="edit" data-id="${t.id}">Edit</button>
      <button class="btn ghost" data-act="reset" data-id="${t.id}">Reset Today</button>
      <button class="btn danger" data-act="delete" data-id="${t.id}">Delete</button>
    </div>`
    }
  `;
  return card;
}

function formatNum(n) {
  if (Number.isInteger(n)) return n.toString();
  return (Math.round(n * 100) / 100).toString();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ---------- Form ----------
function openAddForm() {
  editingId = null;
  document.getElementById('form-title').textContent = 'New Goal';
  document.getElementById('tracker-id').value = '';
  document.getElementById('t-name').value = '';
  document.getElementById('t-unit').value = '';
  document.getElementById('t-goal').value = '';
  document.getElementById('t-icon').value = '';
  document.getElementById('t-remind-on').checked = false;
  document.getElementById('t-remind-time').value = '09:00';
  showView('add');
}

function openEditForm(id) {
  const t = state.trackers.find((x) => x.id === id);
  if (!t) return;
  editingId = id;
  document.getElementById('form-title').textContent = 'Edit Goal';
  document.getElementById('tracker-id').value = id;
  document.getElementById('t-name').value = t.name;
  document.getElementById('t-unit').value = t.unit;
  document.getElementById('t-goal').value = t.goal;
  document.getElementById('t-icon').value = t.icon || '';
  document.getElementById('t-remind-on').checked = !!t.reminder?.on;
  document.getElementById('t-remind-time').value = t.reminder?.time || '09:00';
  showView('add');
}

function handleFormSubmit(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('t-name').value.trim(),
    unit: document.getElementById('t-unit').value.trim(),
    goal: parseFloat(document.getElementById('t-goal').value),
    icon: document.getElementById('t-icon').value.trim(),
    reminder: {
      on: document.getElementById('t-remind-on').checked,
      time: document.getElementById('t-remind-time').value,
    },
  };
  if (!data.name || !data.unit || !(data.goal > 0)) return;

  if (editingId) {
    const t = state.trackers.find((x) => x.id === editingId);
    Object.assign(t, data);
  } else {
    state.trackers.push({ id: uid(), ...data, log: {} });
  }
  saveState();
  scheduleAllReminders();
  evaluateBadges();
  renderTrackers();
  showView('dashboard');
}

// ---------- Logging ----------
function openLogModal(id) {
  const t = state.trackers.find((x) => x.id === id);
  if (!t) return;
  logTargetId = id;
  document.getElementById('log-title').textContent = `Log: ${t.name}`;
  document.getElementById('log-current').textContent =
    `Today: ${formatNum(todayProgress(t))} / ${formatNum(t.goal)} ${t.unit}`;
  document.getElementById('log-amount').value = '';
  document.getElementById('log-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('log-amount').focus(), 50);
}

function closeLogModal() {
  logTargetId = null;
  document.getElementById('log-modal').classList.add('hidden');
}

function saveLog() {
  if (!logTargetId) return;
  const amount = parseFloat(document.getElementById('log-amount').value);
  if (!(amount > 0)) return;
  const t = state.trackers.find((x) => x.id === logTargetId);
  if (!t) return;
  const prev = todayProgress(t);
  t.log = t.log || {};
  t.log[todayKey()] = (t.log[todayKey()] || 0) + amount;

  // Count goal hits the moment we cross the line
  if (prev < t.goal && t.log[todayKey()] >= t.goal) {
    state.stats.totalGoalHits = (state.stats.totalGoalHits || 0) + 1;
  }

  saveState();
  closeLogModal();
  evaluateBadges();
  renderTrackers();
}

function resetToday(id) {
  const t = state.trackers.find((x) => x.id === id);
  if (!t) return;
  if (!confirm(`Reset today's progress for "${t.name}"?`)) return;
  if (t.log) delete t.log[todayKey()];
  saveState();
  renderTrackers();
}

function deleteTracker(id) {
  const t = state.trackers.find((x) => x.id === id);
  if (!t) return;
  if (!confirm(`Delete "${t.name}" and all its history?`)) return;
  state.trackers = state.trackers.filter((x) => x.id !== id);
  saveState();
  scheduleAllReminders();
  renderTrackers();
}

// ---------- Badges ----------
function awardBadge(id) {
  if (state.badges[id]) return false;
  state.badges[id] = Date.now();
  saveState();
  const def = BADGES.find((b) => b.id === id);
  if (def) showBadgeToast(def);
  return true;
}

function evaluateBadges() {
  const trackers = state.trackers;
  const totalLogs = trackers.reduce(
    (sum, t) => sum + Object.keys(t.log || {}).length,
    0
  );

  if (totalLogs >= 1) awardBadge('first-log');
  if (state.stats.totalGoalHits >= 1) awardBadge('goal-hit');
  if (state.stats.totalGoalHits >= 5) awardBadge('goal-x5');
  if (state.stats.totalGoalHits >= 25) awardBadge('goal-x25');
  if (state.stats.totalGoalHits >= 100) awardBadge('goal-x100');

  // Streaks
  let maxStreak = 0;
  trackers.forEach((t) => {
    const s = computeStreak(t);
    if (s > maxStreak) maxStreak = s;
  });
  if (maxStreak >= 3) awardBadge('streak-3');
  if (maxStreak >= 7) awardBadge('streak-7');
  if (maxStreak >= 30) awardBadge('streak-30');

  // Variety
  if (trackers.length >= 3) awardBadge('variety-3');
  if (trackers.length >= 5) awardBadge('variety-5');

  // Time-of-day
  const hour = new Date().getHours();
  if (hour < 8 && totalLogs >= 1) awardBadge('early-bird');
  if (hour >= 22 && totalLogs >= 1) awardBadge('night-owl');

  // Overachiever — 2x goal today on any tracker
  if (trackers.some((t) => todayProgress(t) >= t.goal * 2)) {
    awardBadge('overachiever');
  }

  // Perfect day — every goal hit today, 3+ trackers
  if (
    trackers.length >= 3 &&
    trackers.every((t) => todayProgress(t) >= t.goal)
  ) {
    awardBadge('perfect-day');
  }

  // Challenger
  if (state.challenges.length >= 1) awardBadge('challenger');

  // Champion — won any challenge
  if (state.challenges.some((c) => challengeWinner(c) === 'you')) {
    awardBadge('champion');
  }
}

function renderBadges() {
  const grid = document.getElementById('badge-grid');
  grid.innerHTML = '';
  const earnedCount = BADGES.filter((b) => state.badges[b.id]).length;
  document.getElementById('badge-count-text').textContent =
    `Earned ${earnedCount} of ${BADGES.length}`;
  BADGES.forEach((b) => {
    const earned = !!state.badges[b.id];
    const card = document.createElement('div');
    card.className = `badge-card ${earned ? 'earned' : 'locked'}`;
    card.innerHTML = `
      <span class="badge-emoji">${b.emoji}</span>
      <p class="badge-name">${escapeHtml(b.name)}</p>
      <p class="badge-desc">${escapeHtml(b.desc)}</p>
    `;
    grid.appendChild(card);
  });
}

function renderRecentBadges() {
  const recent = BADGES.filter((b) => state.badges[b.id])
    .map((b) => ({ ...b, t: state.badges[b.id] }))
    .sort((a, b) => b.t - a.t)
    .slice(0, 4);
  const box = document.getElementById('recent-badges');
  const list = document.getElementById('recent-badge-list');
  if (recent.length === 0) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  list.innerHTML = recent
    .map((b) => `<span class="badge-pill">${b.emoji} ${escapeHtml(b.name)}</span>`)
    .join('');
}

function showBadgeToast(def) {
  const toast = document.getElementById('badge-toast');
  document.getElementById('badge-toast-icon').textContent = def.emoji;
  document.getElementById('badge-toast-name').textContent = def.name;
  toast.classList.remove('hidden');
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 400);
  }, 3500);
}

// ---------- Reminders ----------
function scheduleAllReminders() {
  Object.values(reminderTimers).forEach(clearTimeout);
  reminderTimers = {};
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  state.trackers.forEach((t) => {
    if (!t.reminder?.on || !t.reminder.time) return;
    const [hh, mm] = t.reminder.time.split(':').map((x) => parseInt(x, 10));
    const now = new Date();
    const fire = new Date();
    fire.setHours(hh, mm, 0, 0);
    if (fire <= now) fire.setDate(fire.getDate() + 1);
    const delay = fire - now;
    reminderTimers[t.id] = setTimeout(() => {
      try {
        new Notification(`${t.icon || '⏰'} ${t.name}`, {
          body: `Time to log ${t.unit}! Goal: ${t.goal} today.`,
        });
      } catch (_) {}
      scheduleAllReminders();
    }, delay);
  });
}

async function enableNotifications() {
  const status = document.getElementById('notif-status');
  if (!('Notification' in window)) {
    status.textContent = 'This browser does not support notifications.';
    return;
  }
  const perm = await Notification.requestPermission();
  state.notifGranted = perm === 'granted';
  saveState();
  status.textContent =
    perm === 'granted'
      ? 'Notifications enabled. Keep this tab open (or PWA installed) for reminders.'
      : 'Permission was not granted.';
  scheduleAllReminders();
}

// ---------- Challenges ----------
function openNewChallengeForm() {
  editingChallengeId = null;
  document.getElementById('challenge-form-title').textContent = 'New Challenge';
  document.getElementById('ch-id').value = '';
  document.getElementById('ch-name').value = '';
  document.getElementById('ch-username').value = '';
  document.getElementById('ch-unit').value = '';
  document.getElementById('ch-target').value = '';
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  document.getElementById('ch-start').value = firstDay.toISOString().slice(0, 10);
  document.getElementById('ch-end').value = lastDay.toISOString().slice(0, 10);
  showView('new-challenge');
}

function handleChallengeFormSubmit(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('ch-name').value.trim(),
    username: document.getElementById('ch-username').value.trim(),
    unit: document.getElementById('ch-unit').value.trim(),
    target: parseFloat(document.getElementById('ch-target').value),
    start: document.getElementById('ch-start').value,
    end: document.getElementById('ch-end').value,
  };
  if (!data.name || !data.username || !data.unit || !(data.target > 0)) return;

  if (editingChallengeId) {
    const c = state.challenges.find((x) => x.id === editingChallengeId);
    Object.assign(c, data);
  } else {
    state.challenges.push({
      id: uid(),
      ...data,
      myTotal: 0,
      participants: {}, // { name: total }
      createdAt: Date.now(),
    });
  }
  saveState();
  evaluateBadges();
  renderChallenges();
  showView('challenges');
}

function renderChallenges() {
  const list = document.getElementById('challenge-list');
  list.innerHTML = '';
  const none = document.getElementById('no-challenges');
  if (state.challenges.length === 0) {
    none.classList.remove('hidden');
    return;
  }
  none.classList.add('hidden');

  state.challenges
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((c) => {
      const pct = Math.min(100, (c.myTotal / c.target) * 100);
      const card = document.createElement('div');
      card.className = 'challenge-card';
      card.dataset.id = c.id;
      card.innerHTML = `
        <h4>${escapeHtml(c.name)}</h4>
        <p class="meta">${escapeHtml(c.start)} → ${escapeHtml(c.end)} • Goal: ${formatNum(c.target)} ${escapeHtml(c.unit)}</p>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
        <p class="meta" style="margin-top:6px">You: ${formatNum(c.myTotal)} / ${formatNum(c.target)} • ${Object.keys(c.participants).length + 1} participants</p>
      `;
      card.addEventListener('click', () => openChallengeDetail(c.id));
      list.appendChild(card);
    });
}

function openChallengeDetail(id) {
  const c = state.challenges.find((x) => x.id === id);
  if (!c) return;
  const box = document.getElementById('challenge-detail-card');
  const board = leaderboard(c);
  const pct = Math.min(100, (c.myTotal / c.target) * 100);

  box.innerHTML = `
    <h2>${escapeHtml(c.name)}</h2>
    <p class="muted">${escapeHtml(c.start)} → ${escapeHtml(c.end)} • Goal: ${formatNum(c.target)} ${escapeHtml(c.unit)}</p>

    <div class="bar" style="margin-top:14px"><div class="bar-fill" style="width:${pct}%"></div></div>
    <p class="muted" style="margin-top:6px">Your total: <strong>${formatNum(c.myTotal)}</strong> ${escapeHtml(c.unit)} (${Math.round(pct)}%)</p>

    <div class="form-actions" style="margin-top:14px; flex-wrap:wrap">
      <button class="btn primary" data-ch-act="add">+ Add to My Total</button>
      <button class="btn ghost" data-ch-act="invite-qr">🔳 Invite QR</button>
      <button class="btn ghost" data-ch-act="invite">Invite Code</button>
      <button class="btn ghost" data-ch-act="result-qr">🔳 My Result QR</button>
      <button class="btn ghost" data-ch-act="result">Result Code</button>
      <button class="btn ghost" data-ch-act="scan">📷 Scan Result</button>
      <button class="btn ghost" data-ch-act="paste">Paste Result</button>
      <button class="btn danger" data-ch-act="delete">Delete</button>
    </div>

    <h3>Leaderboard</h3>
    <div class="leaderboard">
      ${board
        .map(
          (row, i) => `
        <div class="leaderboard-row ${row.you ? 'you' : ''}">
          <span class="leaderboard-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">#${i + 1}</span>
          <span class="leaderboard-name">${escapeHtml(row.name)}${row.you ? ' (you)' : ''}</span>
          <span class="leaderboard-total">${formatNum(row.total)} ${escapeHtml(c.unit)}</span>
        </div>
      `
        )
        .join('')}
    </div>

    <button class="btn ghost" data-goto="challenges" style="margin-top:16px">← Back</button>
  `;

  // Wire actions
  box.querySelectorAll('[data-ch-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.chAct;
      if (a === 'add') addToChallenge(id);
      else if (a === 'invite') shareInviteCode(id);
      else if (a === 'invite-qr') showChallengeInviteQR(id);
      else if (a === 'result') shareResultCode(id);
      else if (a === 'result-qr') showResultQR(id);
      else if (a === 'scan') openScanner(handleScannedCode);
      else if (a === 'paste') pasteFriendResult(id);
      else if (a === 'delete') deleteChallenge(id);
    });
  });
  box.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', () => showView(el.dataset.goto));
  });

  showView('challenge-detail');
}

function leaderboard(c) {
  const rows = [{ name: c.username || 'You', total: c.myTotal, you: true }];
  Object.entries(c.participants).forEach(([name, total]) => {
    rows.push({ name, total, you: false });
  });
  rows.sort((a, b) => b.total - a.total);
  return rows;
}

function challengeWinner(c) {
  const board = leaderboard(c);
  const now = new Date().toISOString().slice(0, 10);
  if (now < c.end) return null; // not finished
  if (board[0]?.you) return 'you';
  return board[0]?.name || null;
}

function addToChallenge(id) {
  const c = state.challenges.find((x) => x.id === id);
  if (!c) return;
  const amt = prompt(`Add how many ${c.unit} to your total?`);
  const n = parseFloat(amt);
  if (!(n > 0)) return;
  c.myTotal = (c.myTotal || 0) + n;
  saveState();
  evaluateBadges();
  openChallengeDetail(id);
}

function deleteChallenge(id) {
  const c = state.challenges.find((x) => x.id === id);
  if (!c) return;
  if (!confirm(`Delete challenge "${c.name}"?`)) return;
  state.challenges = state.challenges.filter((x) => x.id !== id);
  saveState();
  renderChallenges();
  showView('challenges');
}

// ---------- Challenge Codes ----------
function encode(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function decode(str) {
  return JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
}

function shareInviteCode(id) {
  const c = state.challenges.find((x) => x.id === id);
  if (!c) return;
  const payload = {
    type: 'invite',
    id: c.id,
    name: c.name,
    unit: c.unit,
    target: c.target,
    start: c.start,
    end: c.end,
    from: c.username,
  };
  const code = encode(payload);
  openCodeModal({
    title: 'Invite Code',
    desc: `Share this with a friend. They tap "Join via Code" in their app to join "${c.name}".`,
    text: code,
    actionLabel: 'Copy',
  });
}

function shareResultCode(id) {
  const c = state.challenges.find((x) => x.id === id);
  if (!c) return;
  const payload = {
    type: 'result',
    id: c.id,
    name: c.username || 'Anon',
    total: c.myTotal,
  };
  const code = encode(payload);
  openCodeModal({
    title: 'Your Result Code',
    desc: `Send this to the challenge group. They paste it to update their leaderboard.`,
    text: code,
    actionLabel: 'Copy',
  });
}

function joinViaCode() {
  openCodeModal({
    title: 'Join Challenge',
    desc: 'Paste an invite code from a friend.',
    text: '',
    actionLabel: 'Join',
    onAction: (val) => {
      try {
        const data = decode(val);
        if (data.type !== 'invite') throw new Error('not invite');
        if (state.challenges.some((c) => c.id === data.id)) {
          alert('You already joined this challenge.');
          return;
        }
        const name = prompt('Your display name for this challenge:');
        if (!name) return;
        state.challenges.push({
          id: data.id,
          name: data.name,
          username: name.trim(),
          unit: data.unit,
          target: data.target,
          start: data.start,
          end: data.end,
          myTotal: 0,
          participants: data.from ? { [data.from]: 0 } : {},
          createdAt: Date.now(),
        });
        saveState();
        evaluateBadges();
        renderChallenges();
        showView('challenges');
        closeCodeModal();
      } catch (_) {
        alert('Invalid code.');
      }
    },
  });
}

function pasteFriendResult(challengeId) {
  openCodeModal({
    title: 'Paste Friend Result',
    desc: 'Paste your friend\'s result code to add it to the leaderboard.',
    text: '',
    actionLabel: 'Add',
    onAction: (val) => {
      try {
        const data = decode(val);
        if (data.type !== 'result') throw new Error('not result');
        const targetId = challengeId || data.id;
        const c = state.challenges.find((x) => x.id === targetId);
        if (!c) {
          alert('You haven\'t joined this challenge yet.');
          return;
        }
        if (data.id !== c.id) {
          if (!confirm('This result is for a different challenge. Add anyway?')) return;
        }
        c.participants[data.name] = data.total;
        saveState();
        evaluateBadges();
        closeCodeModal();
        if (challengeId) openChallengeDetail(challengeId);
        else renderChallenges();
      } catch (_) {
        alert('Invalid code.');
      }
    },
  });
}

// ---------- Code Modal ----------
function openCodeModal({ title, desc, text, actionLabel, onAction }) {
  document.getElementById('code-modal-title').textContent = title;
  document.getElementById('code-modal-desc').textContent = desc;
  const ta = document.getElementById('code-modal-text');
  ta.value = text;
  ta.readOnly = !!text && actionLabel === 'Copy';
  const btn = document.getElementById('code-modal-action');
  btn.textContent = actionLabel;
  btn.onclick = () => {
    if (actionLabel === 'Copy') {
      navigator.clipboard?.writeText(ta.value).then(
        () => { btn.textContent = 'Copied!'; setTimeout(() => (btn.textContent = 'Copy'), 1500); },
        () => { ta.select(); }
      );
    } else if (onAction) {
      onAction(ta.value);
    }
  };
  document.getElementById('code-modal').classList.remove('hidden');
}

function closeCodeModal() {
  document.getElementById('code-modal').classList.add('hidden');
}

// ---------- Friends ----------
function renderFriends() {
  const list = document.getElementById('friends-list');
  const none = document.getElementById('no-friends');
  list.innerHTML = '';
  if (state.friends.length === 0) {
    none.classList.remove('hidden');
    return;
  }
  none.classList.add('hidden');

  state.friends
    .slice()
    .sort((a, b) => b.addedAt - a.addedAt)
    .forEach((f) => {
      const row = document.createElement('div');
      row.className = 'friend-row';
      const initial = (f.username || '?').slice(0, 1).toUpperCase();
      row.innerHTML = `
        <div class="friend-avatar">${escapeHtml(initial)}</div>
        <span class="friend-name">${escapeHtml(f.username)}</span>
        <button class="btn primary" data-friend-act="invite" data-name="${escapeHtml(f.username)}">Invite</button>
        <button class="btn danger" data-friend-act="remove" data-name="${escapeHtml(f.username)}">Remove</button>
      `;
      list.appendChild(row);
    });
}

function addFriend(username) {
  username = (username || '').trim();
  if (!username) return false;
  if (username.toLowerCase() === (state.profile.username || '').toLowerCase()) {
    alert("That's your own username.");
    return false;
  }
  if (state.friends.some((f) => f.username.toLowerCase() === username.toLowerCase())) {
    alert(`${username} is already in your friends list.`);
    return false;
  }
  state.friends.push({ username, addedAt: Date.now() });
  saveState();
  renderFriends();
  return true;
}

function removeFriend(username) {
  if (!confirm(`Remove ${username} from friends?`)) return;
  state.friends = state.friends.filter(
    (f) => f.username.toLowerCase() !== username.toLowerCase()
  );
  saveState();
  renderFriends();
}

function inviteFriendToChallenge(username) {
  if (state.challenges.length === 0) {
    alert('Create a challenge first.');
    return;
  }
  const choices = state.challenges
    .map((c, i) => `${i + 1}. ${c.name}`)
    .join('\n');
  const pick = prompt(`Which challenge to invite ${username} to?\n\n${choices}\n\nEnter number:`);
  const idx = parseInt(pick, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= state.challenges.length) return;
  shareInviteCode(state.challenges[idx].id);
}

// ---------- QR Code ----------
function showQRModal({ title, desc, text }) {
  const modal = document.getElementById('qr-modal');
  document.getElementById('qr-modal-title').textContent = title;
  document.getElementById('qr-modal-desc').textContent = desc;
  document.getElementById('qr-text-fallback').value = text;
  const canvas = document.getElementById('qr-canvas');

  if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
    window.QRCode.toCanvas(
      canvas,
      text,
      { width: 280, margin: 1, color: { dark: state.theme.accent1, light: '#ffffff' } },
      (err) => {
        if (err) console.warn('QR generation failed:', err);
      }
    );
  } else {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  modal.classList.remove('hidden');
}

function closeQRModal() {
  document.getElementById('qr-modal').classList.add('hidden');
}

function showMyQR() {
  const username = state.profile.username || '';
  if (!username) {
    alert('Set a username first in Settings → Profile.');
    showView('settings');
    return;
  }
  const payload = { type: 'friend', username };
  const text = encode(payload);
  showQRModal({
    title: 'Your Friend QR',
    desc: `Have a friend scan this to add you (${username}) as a friend.`,
    text,
  });
}

function showChallengeInviteQR(challengeId) {
  const c = state.challenges.find((x) => x.id === challengeId);
  if (!c) return;
  const payload = {
    type: 'invite',
    id: c.id,
    name: c.name,
    unit: c.unit,
    target: c.target,
    start: c.start,
    end: c.end,
    from: c.username,
  };
  const text = encode(payload);
  showQRModal({
    title: 'Invite QR',
    desc: `Friends scan this to join "${c.name}".`,
    text,
  });
}

function showResultQR(challengeId) {
  const c = state.challenges.find((x) => x.id === challengeId);
  if (!c) return;
  const payload = { type: 'result', id: c.id, name: c.username || 'Anon', total: c.myTotal };
  const text = encode(payload);
  showQRModal({
    title: 'Your Result QR',
    desc: `Have the challenge host scan this to add your score to the leaderboard.`,
    text,
  });
}

// ---------- QR Scanner ----------
let scanStream = null;
let scanRAF = null;
let scanContext = null;

async function openScanner(onCode) {
  const modal = document.getElementById('scan-modal');
  const video = document.getElementById('scan-video');
  const canvas = document.getElementById('scan-canvas');
  const status = document.getElementById('scan-status');
  status.textContent = '';

  modal.classList.remove('hidden');

  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'This browser does not support camera access.';
    return;
  }
  if (!window.jsQR) {
    status.textContent = 'QR scanner library failed to load. Check your internet on first run.';
    return;
  }

  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
  } catch (err) {
    status.textContent = 'Camera permission denied or unavailable.';
    return;
  }

  video.srcObject = scanStream;
  video.setAttribute('playsinline', 'true');
  await video.play();

  scanContext = canvas.getContext('2d', { willReadFrequently: true });

  const tick = () => {
    if (!scanStream) return;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      scanRAF = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    scanContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = scanContext.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code && code.data) {
      closeScanner();
      onCode(code.data);
      return;
    }
    scanRAF = requestAnimationFrame(tick);
  };
  tick();
}

function closeScanner() {
  if (scanRAF) cancelAnimationFrame(scanRAF);
  scanRAF = null;
  if (scanStream) {
    scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
  }
  document.getElementById('scan-modal').classList.add('hidden');
}

function handleScannedCode(raw) {
  try {
    const data = decode(raw);
    if (data.type === 'friend') {
      if (addFriend(data.username)) {
        alert(`Added ${data.username} to your friends.`);
      }
    } else if (data.type === 'invite') {
      // Join challenge
      if (state.challenges.some((c) => c.id === data.id)) {
        alert('You already joined this challenge.');
        return;
      }
      const name = state.profile.username || prompt('Your display name:');
      if (!name) return;
      state.challenges.push({
        id: data.id,
        name: data.name,
        username: name.trim(),
        unit: data.unit,
        target: data.target,
        start: data.start,
        end: data.end,
        myTotal: 0,
        participants: data.from ? { [data.from]: 0 } : {},
        createdAt: Date.now(),
      });
      saveState();
      evaluateBadges();
      renderChallenges();
      alert(`Joined "${data.name}"!`);
    } else if (data.type === 'result') {
      const c = state.challenges.find((x) => x.id === data.id);
      if (!c) {
        alert("You haven't joined this challenge.");
        return;
      }
      c.participants[data.name] = data.total;
      saveState();
      evaluateBadges();
      renderChallenges();
      alert(`Added ${data.name}'s result (${data.total}).`);
    } else {
      alert('Unrecognized QR code.');
    }
  } catch (_) {
    alert('Could not read QR code.');
  }
}

// ---------- Settings ----------
function bindSettings() {
  const mainEl = document.getElementById('color-main');
  const a1 = document.getElementById('color-accent1');
  const a2 = document.getElementById('color-accent2');
  mainEl.value = state.theme.main;
  a1.value = state.theme.accent1;
  a2.value = state.theme.accent2;

  mainEl.oninput = (e) => { state.theme.main = e.target.value; applyTheme(); saveState(); };
  a1.oninput = (e) => { state.theme.accent1 = e.target.value; applyTheme(); saveState(); };
  a2.oninput = (e) => { state.theme.accent2 = e.target.value; applyTheme(); saveState(); };

  document.getElementById('reset-theme').onclick = () => {
    state.theme = { ...DEFAULT_THEME };
    mainEl.value = state.theme.main;
    a1.value = state.theme.accent1;
    a2.value = state.theme.accent2;
    applyTheme();
    saveState();
  };

  document.getElementById('enable-notif').onclick = enableNotifications;

  document.getElementById('export-data').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toodledoo-data-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('import-data').onclick = () =>
    document.getElementById('import-file').click();

  document.getElementById('import-file').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data.trackers)) throw new Error('bad file');
        state = { ...state, ...data };
        saveState();
        applyTheme();
        renderTrackers();
        renderChallenges();
        renderBadges();
        alert('Import successful.');
      } catch (_) {
        alert('Invalid file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  document.getElementById('clear-data').onclick = () => {
    if (!confirm('Delete ALL data including challenges and badges? This cannot be undone.')) return;
    state = {
      trackers: [],
      theme: { ...DEFAULT_THEME },
      notifGranted: false,
      badges: {},
      stats: { totalGoalHits: 0 },
      challenges: [],
    };
    saveState();
    applyTheme();
    bindSettings();
    renderTrackers();
    renderChallenges();
    renderBadges();
  };

  document.getElementById('share-snapshot').onclick = () => {
    const snapshot = {
      trackers: state.trackers.map((t) => ({
        name: t.name,
        unit: t.unit,
        goal: t.goal,
        icon: t.icon,
        today: todayProgress(t),
      })),
      date: todayKey(),
    };
    const url = `${location.origin}${location.pathname}#share=${encode(snapshot)}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        document.getElementById('share-status').textContent = 'Link copied to clipboard.';
      })
      .catch(() => {
        document.getElementById('share-status').textContent = url;
      });
  };

  // Profile username
  const userEl = document.getElementById('profile-username');
  userEl.value = state.profile.username || '';
  userEl.addEventListener('input', (e) => {
    state.profile.username = e.target.value.trim().slice(0, 20);
    saveState();
  });

  // PWA Install
  const installBtn = document.getElementById('install-btn');
  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.classList.add('hidden');
  });
}

// ---------- Shared snapshot view ----------
function maybeShowSnapshot() {
  const m = location.hash.match(/^#share=(.+)$/);
  if (!m) return false;
  try {
    const data = decode(m[1]);
    const list = document.getElementById('snapshot-list');
    list.innerHTML = '';
    data.trackers.forEach((t) => {
      list.appendChild(
        buildTrackerCard(
          { id: 'ro', name: t.name, unit: t.unit, goal: t.goal, icon: t.icon, log: { [todayKey()]: t.today } },
          true
        )
      );
    });
    showView('snapshot');
    return true;
  } catch (_) {
    return false;
  }
}

// ---------- Wire up ----------
function bindEvents() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      if (v === 'add') openAddForm();
      else if (v === 'badges') { renderBadges(); showView('badges'); }
      else if (v === 'challenges') { renderChallenges(); renderFriends(); showView('challenges'); }
      else showView(v);
    });
  });

  document.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', () => {
      const v = el.dataset.goto;
      if (v === 'add') openAddForm();
      else if (v === 'challenges') { renderChallenges(); renderFriends(); showView('challenges'); }
      else showView(v);
    });
  });

  document.getElementById('tracker-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    if (act === 'log') openLogModal(id);
    else if (act === 'edit') openEditForm(id);
    else if (act === 'reset') resetToday(id);
    else if (act === 'delete') deleteTracker(id);
  });

  document.getElementById('tracker-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('cancel-edit').addEventListener('click', () => showView('dashboard'));

  document.getElementById('log-save').addEventListener('click', saveLog);
  document.getElementById('log-cancel').addEventListener('click', closeLogModal);
  document.getElementById('log-modal').addEventListener('click', (e) => {
    if (e.target.id === 'log-modal') closeLogModal();
  });
  document.getElementById('log-amount').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveLog();
  });

  // Challenges
  document.getElementById('new-challenge-btn').addEventListener('click', openNewChallengeForm);
  document.getElementById('join-challenge-btn').addEventListener('click', joinViaCode);
  document.getElementById('scan-join-btn').addEventListener('click', () =>
    openScanner(handleScannedCode)
  );
  document.getElementById('paste-result-btn').addEventListener('click', () => pasteFriendResult(null));
  document.getElementById('challenge-form').addEventListener('submit', handleChallengeFormSubmit);
  document.getElementById('cancel-challenge').addEventListener('click', () => showView('challenges'));

  // Friends
  document.getElementById('add-friend-btn').addEventListener('click', () => {
    const input = document.getElementById('friend-username-input');
    if (addFriend(input.value)) input.value = '';
  });
  document.getElementById('friend-username-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-friend-btn').click();
  });
  document.getElementById('scan-friend-btn').addEventListener('click', () =>
    openScanner(handleScannedCode)
  );
  document.getElementById('my-qr-btn').addEventListener('click', showMyQR);

  document.getElementById('friends-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-friend-act]');
    if (!btn) return;
    const name = btn.dataset.name;
    if (btn.dataset.friendAct === 'invite') inviteFriendToChallenge(name);
    else if (btn.dataset.friendAct === 'remove') removeFriend(name);
  });

  // QR modal
  document.getElementById('qr-close-btn').addEventListener('click', closeQRModal);
  document.getElementById('qr-modal').addEventListener('click', (e) => {
    if (e.target.id === 'qr-modal') closeQRModal();
  });
  document.getElementById('qr-copy-btn').addEventListener('click', () => {
    const txt = document.getElementById('qr-text-fallback').value;
    navigator.clipboard?.writeText(txt).then(() => {
      const b = document.getElementById('qr-copy-btn');
      b.textContent = 'Copied!';
      setTimeout(() => (b.textContent = 'Copy Text'), 1500);
    });
  });

  // Scanner modal
  document.getElementById('scan-cancel').addEventListener('click', closeScanner);

  // Code modal
  document.getElementById('code-modal-cancel').addEventListener('click', closeCodeModal);
  document.getElementById('code-modal').addEventListener('click', (e) => {
    if (e.target.id === 'code-modal') closeCodeModal();
  });

  // PWA install event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById('install-btn');
    if (btn) btn.classList.remove('hidden');
  });
}

// ---------- Boot ----------
function init() {
  applyTheme();
  bindEvents();
  bindSettings();

  if (maybeShowSnapshot()) {
    return;
  }

  renderTrackers();
  renderChallenges();
  renderFriends();
  renderBadges();
  showView('dashboard');

  if ('Notification' in window && Notification.permission === 'granted') {
    scheduleAllReminders();
  }

  const s = document.getElementById('notif-status');
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      s.textContent = 'Notifications are enabled.';
    } else if (Notification.permission === 'denied') {
      s.textContent = 'Notifications are blocked. Enable them in browser settings.';
    } else {
      s.textContent = 'Not yet enabled.';
    }
  } else {
    s.textContent = 'This browser does not support notifications.';
  }

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  evaluateBadges();
}

document.addEventListener('DOMContentLoaded', init);
