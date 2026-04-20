// login.js

// ── Redirect already-logged-in users away from login page ──
// BUG FIX: Was reading 'token' and 'role' but api.js saves them as
// 'hs_token' and 'hs_role' — key mismatch caused infinite redirect loop.
(function () {
  const token = localStorage.getItem('hs_token'); // ✅ FIXED (was 'token')
  const role  = localStorage.getItem('hs_role');  // ✅ FIXED (was 'role')
  if (token && role) {
    window.location.replace(
      role === 'ADMIN' ? 'admin-dashboard.html' : 'member-dashboard.html'
    );
  }
})();

function togglePw() {
  const pw  = document.getElementById('password');
  const eye = document.getElementById('toggleEye');
  pw.type         = pw.type === 'password' ? 'text'  : 'password';
  eye.textContent = pw.type === 'text'     ? '👁️'   : '🙈';
}

function showError(msg) {
  const box = document.getElementById('errorBox');
  box.textContent   = msg;
  box.style.display = msg ? 'block' : 'none';
}

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const phone = document.getElementById('mobile').value.trim();
  const pass  = document.getElementById('password').value;
  const btn   = document.getElementById('loginBtn');
  const txt   = document.getElementById('btnText');
  const spin  = document.getElementById('spinner');

  showError('');

  // Validate inputs
  if (!/^\d{10}$/.test(phone)) {
    showError('⚠️ Enter a valid 10-digit mobile number.');
    return;
  }
  if (!pass) {
    showError('⚠️ Password is required.');
    return;
  }

  btn.disabled       = true;
  txt.textContent    = 'Signing in…';
  spin.style.display = 'inline-block';

  try {
    let data;
    const ADMIN_PHONE = '8985593816';

    if (phone === ADMIN_PHONE) {
      data = await Auth.adminLogin(phone, pass);
    } else {
      data = await Auth.memberLogin(phone, pass);
    }

    if (!data || !data.token) {
      throw new Error('Login failed. Please try again.');
    }

    // Save session using api.js saveSession() which uses hs_* keys
    saveSession(data.token, data.role, data.memberId, data.name);

    txt.textContent = '✅ Login successful!';

    const dest = data.role === 'ADMIN' ? 'admin-dashboard.html' : 'member-dashboard.html';
    setTimeout(function () {
      window.location.replace(dest);
    }, 600);

  } catch (err) {
    showError('❌ ' + err.message);
    btn.disabled       = false;
    txt.textContent    = 'Login →';
    spin.style.display = 'none';
  }
});