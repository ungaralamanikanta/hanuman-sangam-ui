// admin-dashboard.js

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth('ADMIN')) return;
  loadAllData();

  // Event delegation on pending table — works even after table re-renders
  document.getElementById('pendingMembersBody')
    .addEventListener('click', function(e) {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id     = parseInt(btn.getAttribute('data-id'));
      const name   = btn.getAttribute('data-name');
      const action = btn.getAttribute('data-action');
      if (action === 'approve') handleApprove(id, name);
      if (action === 'reject')  handleReject(id, name);
    });
});

// ── Master load ───────────────────────────────
async function loadAllData() {
  await Promise.all([
    loadStats(),
    loadApprovedMembers(),
    loadPendingMembers(),
    loadMemberDropdown(),
  ]);
}
function loadAdminDashboard() { loadAllData(); }

// ── Stat Cards — reads from /admin/stats ─────
async function loadStats() {
  try {
    const s = await Admin.getStats();
    showOfflineBanner(false);
    document.getElementById('statTotalCollection').textContent = rupees(s.totalCollection);
    document.getElementById('statTotalPending').textContent    = rupees(s.totalUnpaid);
    document.getElementById('statPendingMembers').textContent  = s.totalPendingMembers || 0;

    // Pre-fill manual update form
    document.getElementById('inputTotalCollection').value = s.totalCollection    || 0;
    document.getElementById('inputTotalPaid').value       = s.totalPaid          || 0;
    document.getElementById('inputTotalUnpaid').value     = s.totalUnpaid        || 0;
    document.getElementById('inputPendingMembers').value  = s.totalPendingMembers || 0;

    const badge = document.getElementById('modeBadge');
    badge.textContent = s.autoCalculated ? 'Auto Mode' : 'Manual Mode';
    badge.className   = 'mode-badge ' + (s.autoCalculated ? 'mode-auto' : 'mode-manual');
  } catch (err) {
    showOfflineBanner(true);
    ['statTotalCollection','statTotalPending','statPendingMembers']
      .forEach(id => { document.getElementById(id).textContent = '—'; });
  }
}

// ── Member dropdown for payment form ─────────
async function loadMemberDropdown() {
  try {
    const members = await Admin.getApproved();
    const sel = document.getElementById('selectMember');
    sel.innerHTML = '<option value="">— Select Member —</option>';
    (members || []).forEach(m => {
      const o = document.createElement('option');
      o.value       = m.id;
      o.textContent = m.name + ' (' + (m.phoneNumber || '') + ')';
      sel.appendChild(o);
    });
  } catch (_) {}
}

// ── Approved members table ────────────────────
async function loadApprovedMembers() {
  const tbody = document.getElementById('approvedMembersBody');
  tbody.innerHTML = '<tr><td colspan="6" class="empty-state skeleton-row">Loading…</td></tr>';
  try {
    const data    = await Admin.getDashboard();
    const members = data.members || [];
    document.getElementById('approvedCount').textContent = members.length + ' members';

    if (!members.length) {
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
        <td><span class="badge badge-approved">✅ Approved</span></td>
      </tr>`).join('');
  } catch (_) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Failed to load members.</td></tr>';
  }
}

// ── Pending approvals table ───────────────────
async function loadPendingMembers() {
  const tbody = document.getElementById('pendingMembersBody');
  tbody.innerHTML = '<tr><td colspan="6" class="empty-state skeleton-row">Loading…</td></tr>';
  try {
    const members = await Admin.getPending();
    document.getElementById('pendingCount').textContent = (members ? members.length : 0) + ' pending';

    if (!members || !members.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">🎉 No pending approvals!</td></tr>';
      return;
    }
    // Use data-* attributes — NO inline onclick with string args (breaks on apostrophes)
    tbody.innerHTML = members.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escHtml(m.name)}</strong></td>
        <td>${escHtml(m.email || '—')}</td>
        <td>${escHtml(m.phoneNumber || '—')}</td>
        <td>${fmtDate(m.registeredAt)}</td>
        <td>
          <button class="btn btn-approve btn-sm"
            data-action="approve"
            data-id="${m.id}"
            data-name="${escAttr(m.name)}">✅ Approve</button>
          <button class="btn btn-reject btn-sm"
            data-action="reject"
            data-id="${m.id}"
            data-name="${escAttr(m.name)}">❌ Reject</button>
        </td>
      </tr>`).join('');
  } catch (_) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Failed to load pending approvals.</td></tr>';
  }
}

// ── Approve ───────────────────────────────────
function handleApprove(id, name) {
  openModal('✅', 'Approve Member',
    'Approve "' + name + '" and send welcome email?',
    async function() {
      try {
        await Admin.approveMember(id);
        showToast('✅ ' + name + ' approved!', 'success');
        loadAllData();
      } catch (err) {
        showToast('❌ ' + err.message, 'error');
      }
    }
  );
}

// ── Reject ────────────────────────────────────
function handleReject(id, name) {
  openModal('❌', 'Reject Member',
    'Reject "' + name + '"? They will be notified by email.',
    async function() {
      try {
        await Admin.rejectMember(id);
        showToast('Member rejected.', 'info');
        loadAllData();
      } catch (err) {
        showToast('❌ ' + err.message, 'error');
      }
    }
  );
}

// ── Record Payment ────────────────────────────
async function recordPayment(operation) {
  const memberId = document.getElementById('selectMember').value;
  const amount   = parseFloat(document.getElementById('paymentAmount').value);
  const type     = document.getElementById('paymentType').value;
  const status   = document.getElementById('paymentStatus').value;

  if (!memberId)              { showToast('⚠️ Select a member.', 'warning'); return; }
  if (!amount || amount <= 0) { showToast('⚠️ Enter a valid amount.', 'warning'); return; }

  const btn = document.getElementById(operation === 'ADD' ? 'btnAdd' : 'btnSubtract');
  btn.disabled    = true;
  btn.textContent = operation === 'ADD' ? '…Adding' : '…Subtracting';

  try {
    await Admin.recordPayment({
      memberId:      parseInt(memberId),
      amount,
      paymentStatus: status,
      operation,
      note:          type
    });
    showToast('✅ Payment recorded!', 'success');
    document.getElementById('paymentAmount').value = '';
    document.getElementById('selectMember').value  = '';
    loadAllData();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = operation === 'ADD' ? '＋ Add' : '− Subtract';
  }
}

// ── Manual stats save ─────────────────────────
async function saveStatsManual() {
  const btn = document.getElementById('btnSaveManual');
  btn.disabled    = true;
  btn.textContent = '💾 Saving…';
  try {
    await Admin.updateStats({
      autoCalculate:       false,
      totalCollection:     parseFloat(document.getElementById('inputTotalCollection').value) || 0,
      totalPaid:           parseFloat(document.getElementById('inputTotalPaid').value)       || 0,
      totalUnpaid:         parseFloat(document.getElementById('inputTotalUnpaid').value)     || 0,
      totalPendingMembers: parseInt(document.getElementById('inputPendingMembers').value)    || 0,
    });
    showToast('✅ Stats saved! Home page updated.', 'success');
    loadStats();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = '💾 Save Manual Values';
  }
}

// ── Auto-calc stats ───────────────────────────
async function saveStatsAuto() {
  const btn = document.getElementById('btnAutoCalc');
  btn.disabled    = true;
  btn.textContent = '⚡ Calculating…';
  try {
    await Admin.updateStats({ autoCalculate: true });
    showToast('✅ Stats auto-calculated!', 'success');
    loadStats();
    loadApprovedMembers();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = '⚡ Auto-Calculate from Payments';
  }
}

// ── Send announcement ─────────────────────────
async function sendAnnouncement() {
  const title = document.getElementById('announcementTitle').value.trim();
  const msg   = document.getElementById('announcementMessage').value.trim();
  const btn   = document.getElementById('btnAnnounce');
  if (!title) { showToast('⚠️ Enter a title.', 'warning'); return; }
  if (!msg)   { showToast('⚠️ Enter a message.', 'warning'); return; }
  btn.disabled    = true;
  btn.textContent = '📣 Sending…';
  try {
    await Admin.sendAnnouncement({ title, message: msg });
    showToast('📣 Sent to all members!', 'success');
    document.getElementById('announcementTitle').value   = '';
    document.getElementById('announcementMessage').value = '';
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = '📣 Send to All';
  }
}
