// ── State ─────────────────────────────────────────────────────────────────────

let shifts = [];
let activeShiftId = null;
let liveTimerInterval = null;

function loadState() {
  try { shifts = JSON.parse(localStorage.getItem('shifts')) || []; }
  catch { shifts = []; }
  activeShiftId = localStorage.getItem('activeShiftId') || null;
}

function saveState() {
  localStorage.setItem('shifts', JSON.stringify(shifts));
  localStorage.setItem('activeShiftId', activeShiftId || '');
}

// ── Clock actions ─────────────────────────────────────────────────────────────

function clockIn() {
  if (activeShiftId) return;
  const shift = {
    id: Date.now().toString(),
    startDate: new Date().toISOString(),
    endDate: null,
    notes: ''
  };
  shifts.unshift(shift);
  activeShiftId = shift.id;
  saveState();
  render();
  startLiveTimer();
}

function clockOut() {
  if (!activeShiftId) return;
  const shift = shifts.find(s => s.id === activeShiftId);
  if (shift) shift.endDate = new Date().toISOString();
  activeShiftId = null;
  saveState();
  stopLiveTimer();
  render();
}

function deleteShift(id) {
  if (!confirm('Delete this shift?')) return;
  if (id === activeShiftId) {
    activeShiftId = null;
    stopLiveTimer();
  }
  shifts = shifts.filter(s => s.id !== id);
  saveState();
  render();
}

function updateNotes(id, notes) {
  const shift = shifts.find(s => s.id === id);
  if (shift) shift.notes = notes;
  saveState();
}

// ── Time utilities ────────────────────────────────────────────────────────────

function formatMs(ms) {
  if (ms <= 0) return '00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatMsLong(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d) {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1)); // Monday-based
  return startOfDay(copy);
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function shiftDurationMs(shift) {
  if (!shift.endDate) return 0;
  return new Date(shift.endDate) - new Date(shift.startDate);
}

function sumShifts(list) {
  return list.reduce((total, s) => total + shiftDurationMs(s), 0);
}

function completedShiftsSince(since) {
  return shifts.filter(s => s.endDate && new Date(s.startDate) >= since);
}

// ── Totals ────────────────────────────────────────────────────────────────────

function updateTotals() {
  const now = new Date();
  document.getElementById('todayTotal').textContent = formatMs(sumShifts(completedShiftsSince(startOfDay(now))));
  document.getElementById('weekTotal').textContent  = formatMs(sumShifts(completedShiftsSince(startOfWeek(now))));
  document.getElementById('monthTotal').textContent = formatMs(sumShifts(completedShiftsSince(startOfMonth(now))));
}

// ── Live timer ────────────────────────────────────────────────────────────────

function startLiveTimer() {
  stopLiveTimer();
  const el = document.getElementById('liveTimer');
  el.classList.remove('hidden');
  liveTimerInterval = setInterval(() => {
    const shift = shifts.find(s => s.id === activeShiftId);
    if (!shift) return;
    el.textContent = formatMsLong(Date.now() - new Date(shift.startDate));
  }, 1000);
}

function stopLiveTimer() {
  clearInterval(liveTimerInterval);
  liveTimerInterval = null;
  const el = document.getElementById('liveTimer');
  if (el) el.classList.add('hidden');
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const isActive = !!activeShiftId;

  document.getElementById('clockInBtn').disabled  = isActive;
  document.getElementById('clockOutBtn').disabled = !isActive;

  const badge = document.getElementById('statusBadge');
  badge.textContent = isActive ? 'Clocked On' : 'Clocked Off';
  badge.className   = isActive ? 'status-badge active' : 'status-badge';

  renderHistory();
  updateTotals();
}

function renderHistory() {
  const list = document.getElementById('shiftList');
  list.innerHTML = '';

  if (shifts.length === 0) {
    list.innerHTML = '<li class="empty">No shifts recorded yet.</li>';
    return;
  }

  shifts.forEach(shift => {
    const isActive = shift.id === activeShiftId;
    const start    = new Date(shift.startDate);
    const end      = shift.endDate ? new Date(shift.endDate) : null;
    const duration = end ? formatMs(shiftDurationMs(shift)) : '—';

    const li = document.createElement('li');
    li.className = isActive ? 'shift-item active-shift' : 'shift-item';
    li.innerHTML = `
      <div class="shift-row">
        <div class="shift-times">
          <span class="shift-date">${fmtDate(start)}</span>
          <span class="shift-range">${fmtTime(start)} → ${end ? fmtTime(end) : '<em>in progress</em>'}</span>
        </div>
        <div class="shift-meta">
          <span class="shift-duration">${duration}</span>
          ${!isActive ? `<button class="delete-btn" onclick="deleteShift('${shift.id}')" title="Delete shift">✕</button>` : ''}
        </div>
      </div>
      <input
        type="text"
        class="notes-input"
        placeholder="Add notes…"
        value="${escHtml(shift.notes)}"
        onchange="updateNotes('${shift.id}', this.value)"
      >
    `;
    list.appendChild(li);
  });
}

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(d) {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── CSV export / import ───────────────────────────────────────────────────────

function exportCSV() {
  const header = 'id,start,end,duration_minutes,notes';
  const rows = shifts.map(s => {
    const mins = s.endDate
      ? ((new Date(s.endDate) - new Date(s.startDate)) / 60000).toFixed(2)
      : '';
    const notes = `"${(s.notes || '').replace(/"/g, '""')}"`;
    return [s.id, s.startDate, s.endDate || '', mins, notes].join(',');
  });

  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `shiftstamp-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function importCSV() {
  const input  = document.createElement('input');
  input.type   = 'file';
  input.accept = '.csv';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines      = ev.target.result.trim().split('\n');
      const existing   = new Set(shifts.map(s => s.id));
      const dataLines  = lines[0].startsWith('id,') ? lines.slice(1) : lines;
      let imported     = 0;

      dataLines.forEach(line => {
        const [id, start, end, , notesRaw] = line.split(',');
        if (!id || !start) return;
        if (existing.has(id)) return;
        const notes = (notesRaw || '').replace(/^"|"$/g, '').replace(/""/g, '"');
        shifts.push({ id, startDate: start, endDate: end || null, notes });
        imported++;
      });

      shifts.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      saveState();
      render();
      alert(`Imported ${imported} new shift${imported !== 1 ? 's' : ''}.`);
    };
    reader.readAsText(file);
  };
  input.click();
}

// ── PWA ───────────────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js'));
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  render();
  if (activeShiftId) startLiveTimer();
});
