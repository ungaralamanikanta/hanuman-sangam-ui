// member-dashboard.js

let allMembers  = [];
let pollTimer   = null;
let lastPaidVal = null;
let lastPendVal = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth('MEMBER')) return;

  // Search filter
  const inp = document.getElementById('searchInput');
  if (inp) {
    inp.addEventListener('input', () => {
      const q = inp.value.toLowerCase();
      renderMembersTable(allMembers.filter(m =>
        (m.name    || '').toLowerCase().includes(q) ||
        (m.contact || '').toLowerCase().includes(q)
      ));
    });
  }

  // Load everything on first open
  loadAll();

  // Live polling every 10 seconds — shows admin payment updates instantly
  pollTimer = setInterval(pollLive, 10000);
});

// ── Full load (on page open) ──────────────────
async function loadAll() {
  await Promise.allSettled([
    loadMyProfile(),
    loadAllMembers(),
    loadMyPayments(),
    loadAnnouncements(),
  ]);
}

// ── Live poll (every 10s) ─────────────────────
async function pollLive() {
  try {
    const profile = await Member.getProfile();
    const newPaid = profile.totalPaid;
    const newPend = profile.totalPending;

    if (newPaid !== lastPaidVal) {
      document.getElementById('totalPaid').textContent = rupees(newPaid);
      lastPaidVal = newPaid;
      flashElement('totalPaid');
    }
    if (newPend !== lastPendVal) {
      document.getElementById('totalPending').textContent = rupees(newPend);
      lastPendVal = newPend;
      flashElement('totalPending');
    }

    const data    = await apiFetch('/member/members');
    // FIX: Backend returns a plain array [], NOT { members: [] }
    const members = Array.isArray(data) ? data : [];
    allMembers    = members;
    document.getElementById('memberCount').textContent = members.length + ' members';

    const inp = document.getElementById('searchInput');
    if (!inp || !inp.value.trim()) renderMembersTable(members);

  } catch (_) { /* silent — don't show errors during background poll */ }
}

// Flash animation to show live update
function flashElement(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.transition = 'color 0.3s';
  el.style.color      = '#FF6B00';
  setTimeout(() => { el.style.color = ''; }, 1200);
}

// ── My Profile / Summary Cards ────────────────
async function loadMyProfile() {
  try {
    const profile = await Member.getProfile();
    showOfflineBanner(false);

    lastPaidVal = profile.totalPaid;
    lastPendVal = profile.totalPending;

    document.getElementById('totalPaid').textContent    = rupees(profile.totalPaid);
    document.getElementById('totalPending').textContent = rupees(profile.totalPending);

    const now = new Date();
    const due = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > 5 ? 1 : 0), 5);
    document.getElementById('dueDate').textContent =
      '5 ' + due.toLocaleString('en-IN', { month: 'short', year: 'numeric' });

  } catch (err) {
    showOfflineBanner(true);
  }
}

// ── All Approved Members Table ────────────────
async function loadAllMembers() {
  const tbody = document.getElementById('memberTable');
  tbody.innerHTML = '<tr><td colspan="6" class="empty-state skeleton-row">Loading…</td></tr>';
  try {
    const data = await apiFetch('/member/members');
    // FIX: Backend returns a plain array [], NOT { members: [] }
    allMembers = Array.isArray(data) ? data : [];
    document.getElementById('memberCount').textContent = allMembers.length + ' members';
    renderMembersTable(allMembers);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Could not load members.</td></tr>';
  }
}

function renderMembersTable(members) {
  const tbody = document.getElementById('memberTable');
  if (!members || !members.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No approved members yet.</td></tr>';
    return;
  }
  tbody.innerHTML = members.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${escHtml(m.name)}</strong></td>
      <td class="paid-cell">${rupees(m.paid)}</td>
      <td class="pending-cell">${rupees(m.pending)}</td>
      <td>${escHtml(m.contact || '—')}</td>
      <td><span class="badge badge-approved">✅ Active</span></td>
    </tr>`).join('');
}

// ── My Payment History ────────────────────────
async function loadMyPayments() {
  const tbody = document.getElementById('paymentTable');
  tbody.innerHTML = '<tr><td colspan="6" class="empty-state skeleton-row">Loading…</td></tr>';
  try {
    const payments = await Member.getPayments();
    if (!payments || !payments.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No payment records yet.</td></tr>';
      return;
    }
    tbody.innerHTML = payments.map((p, i) => {
      const isSub = p.operation === 'SUBTRACT';
      return `<tr>
        <td>${i + 1}</td>
        <td class="${isSub ? 'pending-cell' : 'paid-cell'}">${isSub ? '−' : '+'} ${rupees(p.amount)}</td>
        <td><span class="badge ${isSub ? 'badge-rejected' : 'badge-approved'}">${p.operation || 'ADD'}</span></td>
        <td>${escHtml(p.note || '—')}</td>
        <td>${fmtDate(p.paymentDate)}</td>
        <td><span class="badge ${p.paymentStatus === 'PAID' ? 'badge-approved' : 'badge-pending'}">
          ${p.paymentStatus === 'PAID' ? '✅ Paid' : '⏳ Unpaid'}
        </span></td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Could not load payments.</td></tr>';
  }
}

// ── Announcements ─────────────────────────────
async function loadAnnouncements() {
  const list = document.getElementById('announceList');
  try {
    const items = await apiFetch('/admin/announcements');
    if (!items || !items.length) {
      list.innerHTML = '<p class="text-muted" style="font-style:italic">No announcements yet.</p>';
      return;
    }
    list.innerHTML = items.map(a => `
      <div class="announce-item">
        <div class="announce-title">📢 ${escHtml(a.title)}</div>
        <div class="announce-msg">${escHtml(a.message)}</div>
        <div class="announce-date">${fmtDate(a.createdAt)}</div>
      </div>`).join('');
  } catch (err) {
    list.innerHTML = '<p class="text-muted">Could not load announcements.</p>';
  }
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}