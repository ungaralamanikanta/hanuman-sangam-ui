// register.js

// ── Block if already logged in ────────────────
// BUG FIX: Was reading 'token' and 'role' but api.js saves them as
// 'hs_token' and 'hs_role' — same key mismatch bug as login.js
(function () {
  const token = localStorage.getItem('hs_token'); // ✅ FIXED (was 'token')
  const role  = localStorage.getItem('hs_role');  // ✅ FIXED (was 'role')
  if (token && role) {
    window.location.href = role === 'ADMIN' ? 'admin-dashboard.html' : 'member-dashboard.html';
  }
})();

let otpSent     = false;
let otpVerified = false;

function showMsg(msg, type = 'error') {
  const box = document.getElementById('msgBox');
  box.textContent   = msg;
  box.className     = 'msg-box msg-' + type;
  box.style.display = msg ? 'block' : 'none';
}

function togglePw() {
  const pw = document.getElementById('password');
  const t  = document.querySelector('.pw-toggle');
  if (pw.type === 'password') { pw.type = 'text';     t.textContent = '👁️'; }
  else                        { pw.type = 'password'; t.textContent = '🙈'; }
}

// ── Step 1: Send OTP ──────────────────────────
async function sendOTP() {
  const email = document.getElementById('email').value.trim();
  const btn   = document.getElementById('otpBtn');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMsg('⚠️ Please enter a valid email address first.');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Sending…';
  showMsg('');

  try {
    await Auth.sendOtp(email);
    otpSent = true;
    showMsg('✅ OTP sent to ' + email + '. Please check your inbox!', 'success');

    // 60s cooldown
    let secs = 60;
    btn.disabled = true;
    const iv = setInterval(() => {
      secs--;
      btn.textContent = 'Resend (' + secs + 's)';
      if (secs <= 0) {
        clearInterval(iv);
        btn.disabled    = false;
        btn.textContent = 'Resend OTP';
      }
    }, 1000);

  } catch (err) {
    showMsg('❌ ' + err.message);
    btn.disabled    = false;
    btn.textContent = 'Send OTP';
  }
}

// ── Step 2+3: Verify OTP + Register ──────────
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name   = document.getElementById('name').value.trim();
  const email  = document.getElementById('email').value.trim();
  const mobile = document.getElementById('mobile').value.trim();
  const otp    = document.getElementById('otp').value.trim();
  const pass   = document.getElementById('password').value;

  const btn    = document.getElementById('regBtn');
  const btnTxt = document.getElementById('regBtnText');
  const spin   = document.getElementById('spinner');

  // Validate
  if (!name || name.length < 3) { showMsg('⚠️ Enter your full name (min 3 characters).'); return; }
  if (!email)                    { showMsg('⚠️ Email is required.'); return; }
  if (!/^\d{10}$/.test(mobile)) { showMsg('⚠️ Enter a valid 10-digit mobile number.'); return; }
  if (!otpSent)                  { showMsg('⚠️ Please send OTP to your email first.'); return; }
  if (!otp || otp.length !== 6) { showMsg('⚠️ Enter the 6-digit OTP sent to your email.'); return; }
  if (!pass || pass.length < 6) { showMsg('⚠️ Password must be at least 6 characters.'); return; }

  btn.disabled       = true;
  btnTxt.textContent = 'Verifying OTP…';
  spin.style.display = 'inline-block';

  try {
    // Step 2: Verify OTP
    if (!otpVerified) {
      await Auth.verifyOtp(email, otp);
      otpVerified = true;
    }

    btnTxt.textContent = 'Creating account…';

    // Step 3: Register — sends status PENDING to backend
    await Auth.register({
      name,
      email,
      phoneNumber: mobile,
      password:    pass
    });

    // After register, show success and redirect to login.
    // Member must wait for admin approval — do NOT auto-login.
    showMsg(
      '🎉 Registration successful! Your account is PENDING admin approval. ' +
      'You will receive an email once approved. Redirecting to login…',
      'success'
    );
    document.getElementById('registerForm').reset();
    otpSent     = false;
    otpVerified = false;
    btn.disabled       = false;
    btnTxt.textContent = 'Create Account 🙏';
    spin.style.display = 'none';

    setTimeout(() => { window.location.href = 'login.html'; }, 3500);

  } catch (err) {
    showMsg('❌ ' + err.message);
    btn.disabled       = false;
    btnTxt.textContent = 'Create Account 🙏';
    spin.style.display = 'none';
    if (err.message.includes('OTP')) otpVerified = false;
  }
});