// api.js — Central API layer

// FIX: Changed from relative '/api' to absolute URL with port 8081.
// Relative URL only works when HTML is served BY the backend.
// Since HTML files are opened directly from file://, we must use
// the full absolute URL so API calls reach the Spring Boot server.
const API_BASE = 'http://localhost:8081;

// ── Session helpers ───────────────────────────
function getToken()      { return localStorage.getItem('hs_token'); }
function getRole()       { return localStorage.getItem('hs_role'); }
function getMemberId()   { return localStorage.getItem('hs_memberId'); }
function getMemberName() { return localStorage.getItem('hs_memberName'); }

function saveSession(token, role, memberId, name) {
  localStorage.setItem('hs_token',      token    || '');
  localStorage.setItem('hs_role',       role     || '');
  localStorage.setItem('hs_memberId',   memberId || '');
  localStorage.setItem('hs_memberName', name     || '');
}

function clearSession() {
  ['hs_token', 'hs_role', 'hs_memberId', 'hs_memberName']
    .forEach(k => localStorage.removeItem(k));
}

function isLoggedIn() { return !!getToken(); }
function isAdmin()    { return getRole() === 'ADMIN'; }
function isMember()   { return getRole() === 'MEMBER'; }

// ── Auth headers ──────────────────────────────
function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

// ── Core fetch ────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      headers: authHeaders(),
      ...options
    });

    if (res.status === 401) {
      clearSession();
      window.location.replace('login.html');
      return null;
    }

    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) {}

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Error ' + res.status);
    }
    return data;

  } catch (err) {
    if (err.name === 'TypeError') {
      throw new Error('Cannot reach server. Make sure backend is running on port 8081.');
    }
    throw err;
  }
}

// ── AUTH ──────────────────────────────────────
const Auth = {
  sendOtp:     (email)       => apiFetch('/auth/send-otp',     { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOtp:   (email, otp)  => apiFetch('/auth/verify-otp',   { method: 'POST', body: JSON.stringify({ email, otp }) }),
  register:    (payload)     => apiFetch('/auth/register',     { method: 'POST', body: JSON.stringify(payload) }),
  memberLogin: (phone, pass) => apiFetch('/auth/member-login', { method: 'POST', body: JSON.stringify({ phoneNumber: phone, password: pass }) }),
  adminLogin:  (phone, pass) => apiFetch('/auth/admin-login',  { method: 'POST', body: JSON.stringify({ phoneNumber: phone, password: pass }) }),
};

// ── ADMIN ─────────────────────────────────────
const Admin = {
  getAllMembers:       ()         => apiFetch('/admin/members'),
  getApproved:        ()         => apiFetch('/admin/members/approved'),
  getPending:         ()         => apiFetch('/admin/members/pending'),
  approveMember:      (id)       => apiFetch('/admin/members/' + id + '/approve', { method: 'PUT' }),
  rejectMember:       (id)       => apiFetch('/admin/members/' + id + '/reject',  { method: 'PUT' }),
  deleteMember:       (id)       => apiFetch('/admin/members/' + id,              { method: 'DELETE' }),
  updateMember:       (id, body) => apiFetch('/admin/members/' + id,              { method: 'PUT',    body: JSON.stringify(body) }),
  recordPayment:      (body)     => apiFetch('/admin/payments',                   { method: 'POST',   body: JSON.stringify(body) }),
  getAllPayments:      ()         => apiFetch('/admin/payments'),
  getMemberPayments:  (id)       => apiFetch('/admin/payments/member/' + id),
  deletePayment:      (id)       => apiFetch('/admin/payments/' + id,             { method: 'DELETE' }),
  getDashboard:       (month)    => apiFetch('/admin/dashboard' + (month ? '?month=' + month : '')),
  getStats:           ()         => apiFetch('/admin/stats'),
  updateStats:        (body)     => apiFetch('/admin/stats',                      { method: 'PUT',    body: JSON.stringify(body) }),
  sendAnnouncement:   (body)     => apiFetch('/admin/announcements',              { method: 'POST',   body: JSON.stringify(body) }),
  getAnnouncements:   ()         => apiFetch('/admin/announcements'),
  deleteAnnouncement: (id)       => apiFetch('/admin/announcements/' + id,        { method: 'DELETE' }),
};

// ── MEMBER ────────────────────────────────────
const Member = {
  getProfile:  () => apiFetch('/member/profile'),
  getPayments: () => apiFetch('/member/payments'),
};
