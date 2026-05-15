// login.js

// ── Redirect already-logged-in users ──────────
(function () {
  const token = localStorage.getItem('hs_token');
  const role  = localStorage.getItem('hs_role');
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

// ── LOGIN ─────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const phone = document.getElementById('mobile').value.trim();
  const pass  = document.getElementById('password').value;
  const btn   = document.getElementById('loginBtn');
  const txt   = document.getElementById('btnText');
  const spin  = document.getElementById('spinner');

  showError('');

  if (!/^\d{10}$/.test(phone)) {
    showError('⚠️ Enter a valid 10-digit mobile number.');
    return;
  }
  if (!pass) {
    showError('⚠️ Password is required.');
    return;
  }

  btn.disabled = true; txt.textContent = 'Signing in…'; spin.style.display = 'inline-block';

  try {
    let data;
    const ADMIN_PHONE = '8985593816';
    if (phone === ADMIN_PHONE) {
      data = await Auth.adminLogin(phone, pass);
    } else {
      data = await Auth.memberLogin(phone, pass);
    }

    if (!data || !data.token) throw new Error('Login failed. Please try again.');

    saveSession(data.token, data.role, data.memberId, data.name);
    txt.textContent = '✅ Login successful!';

    const dest = data.role === 'ADMIN' ? 'admin-dashboard.html' : 'member-dashboard.html';
    setTimeout(function () { window.location.replace(dest); }, 600);

  } catch (err) {
    showError('❌ ' + err.message);
    btn.disabled = false; txt.textContent = 'Login →'; spin.style.display = 'none';
  }
});

// ── FORGOT PASSWORD (by Email) ────────────────

function showForgot() {
  document.getElementById('loginSection').style.display  = 'none';
  document.getElementById('forgotSection').style.display = 'block';
  clearForgotState();
}

function showLogin() {
  document.getElementById('forgotSection').style.display = 'none';
  document.getElementById('loginSection').style.display  = 'block';
  resetForgotSteps();
}

function clearForgotState() {
  document.getElementById('forgotError').style.display   = 'none';
  document.getElementById('forgotSuccess').style.display = 'none';
}

function showForgotError(msg) {
  const el = document.getElementById('forgotError');
  el.textContent = msg; el.style.display = 'block';
  document.getElementById('forgotSuccess').style.display = 'none';
}

function showForgotSuccess(msg) {
  const el = document.getElementById('forgotSuccess');
  el.textContent = msg; el.style.display = 'block';
  document.getElementById('forgotError').style.display = 'none';
}

function resetForgotSteps() {
  document.getElementById('forgotStep1').style.display = 'block';
  document.getElementById('forgotStep2').style.display = 'none';
  document.getElementById('forgotStep3').style.display = 'none';
  ['forgotEmail','forgotOtp','newPassword','confirmPassword']
    .forEach(id => { document.getElementById(id).value = ''; });
  clearForgotState();
}

// Step 1 — Send OTP to email
async function sendForgotOtp() {
  const email = document.getElementById('forgotEmail').value.trim();
  const btn   = document.getElementById('btnSendForgotOtp');
  const txt   = document.getElementById('forgotOtpBtnText');
  const spin  = document.getElementById('forgotOtpSpinner');

  clearForgotState();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showForgotError('⚠️ Enter a valid email address.');
    return;
  }

  btn.disabled = true; txt.textContent = 'Sending…'; spin.style.display = 'inline-block';

  try {
    const res = await Auth.forgotSendOtp(email);
    showForgotSuccess('✅ ' + res.message);
    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
  } catch (err) {
    showForgotError('❌ ' + err.message);
  } finally {
    btn.disabled = false; txt.textContent = 'Send OTP →'; spin.style.display = 'none';
  }
}

// Step 2 — Verify OTP
async function verifyForgotOtp() {
  const email = document.getElementById('forgotEmail').value.trim();
  const otp   = document.getElementById('forgotOtp').value.trim();
  const btn   = document.getElementById('btnVerifyForgotOtp');
  const txt   = document.getElementById('forgotVerifyBtnText');
  const spin  = document.getElementById('forgotVerifySpinner');

  clearForgotState();

  if (!otp || otp.length !== 6) {
    showForgotError('⚠️ Enter the 6-digit OTP sent to your email.');
    return;
  }

  btn.disabled = true; txt.textContent = 'Verifying…'; spin.style.display = 'inline-block';

  try {
    const res = await Auth.forgotVerifyOtp(email, otp);
    showForgotSuccess('✅ ' + res.message);
    document.getElementById('forgotStep2').style.display = 'none';
    document.getElementById('forgotStep3').style.display = 'block';
  } catch (err) {
    showForgotError('❌ ' + err.message);
  } finally {
    btn.disabled = false; txt.textContent = 'Verify OTP →'; spin.style.display = 'none';
  }
}

// Step 3 — Reset Password
async function resetPassword() {
  const email   = document.getElementById('forgotEmail').value.trim();
  const newPass = document.getElementById('newPassword').value;
  const confPass= document.getElementById('confirmPassword').value;
  const btn     = document.getElementById('btnResetPassword');
  const txt     = document.getElementById('resetBtnText');
  const spin    = document.getElementById('resetSpinner');

  clearForgotState();

  if (newPass.length < 6)   { showForgotError('⚠️ Password must be at least 6 characters.'); return; }
  if (newPass !== confPass) { showForgotError('⚠️ Passwords do not match.'); return; }

  btn.disabled = true; txt.textContent = 'Resetting…'; spin.style.display = 'inline-block';

  try {
    const res = await Auth.forgotReset(email, newPass);
    showForgotSuccess('✅ ' + res.message + ' Redirecting to login…');
    setTimeout(() => showLogin(), 2500);
  } catch (err) {
    showForgotError('❌ ' + err.message);
  } finally {
    btn.disabled = false; txt.textContent = 'Reset Password →'; spin.style.display = 'none';
  }
}
