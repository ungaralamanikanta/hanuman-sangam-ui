// common.js — Shared helpers

// ── Toast ─────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = 'toast toast-' + type + ' show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Currency ──────────────────────────────────
function rupees(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

// ── Date ──────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ── Logout ────────────────────────────────────
function logout() {
  clearSession();
  window.location.href = 'login.html';
}

// ── Nav name ──────────────────────────────────
function initNav() {
  const el = document.getElementById('navUser') || document.getElementById('navUsername');
  if (el) el.textContent = getMemberName() || (isAdmin() ? 'Admin' : 'Member');
}

// ── Auth guard ────────────────────────────────
function requireAuth(expectedRole) {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  if (expectedRole && getRole() !== expectedRole) {
    window.location.href = isAdmin() ? 'admin-dashboard.html' : 'member-dashboard.html';
    return false;
  }
  return true;
}

// ── Offline banner ────────────────────────────
function showOfflineBanner(show) {
  const b = document.getElementById('offlineBanner');
  if (b) b.style.display = show ? 'block' : 'none';
}

// ── Modal ─────────────────────────────────────
// BUG FIX: Original confirmAction() called closeModal() FIRST which set
// _confirmCb = null, then tried to call _confirmCb() — so nothing happened.
// Fix: save callback to a local var before closing.
let _confirmCb = null;

function openModal(icon, title, msg, cb) {
  const modal = document.getElementById('confirmModal');
  if (!modal) { if (cb) cb(); return; }   // no modal in page → run directly
  document.getElementById('modalIcon').textContent  = icon;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMsg').textContent   = msg;
  modal.style.display = 'flex';
  _confirmCb = cb;
}

function closeModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.style.display = 'none';
  _confirmCb = null;
}

function confirmAction() {
  // BUG FIX: grab the callback BEFORE closing (closing sets _confirmCb=null)
  const cb = _confirmCb;
  closeModal();
  if (cb) cb();
}

// ── Escape HTML ───────────────────────────────
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escAttr(s) {
  return String(s || '')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Run on every page load ────────────────────
document.addEventListener('DOMContentLoaded', initNav);