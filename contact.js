// contact.js

document.addEventListener('DOMContentLoaded', () => {
  // Set nav user name
  const navUser = document.getElementById('navUser');
  if (navUser) navUser.textContent = getMemberName() || 'Welcome';

  // Pre-fill name/email/phone if member is logged in
  if (isLoggedIn()) {
    const nameEl = document.getElementById('cName');
    const phoneEl = document.getElementById('cPhone');
    if (nameEl  && getMemberName()) nameEl.value  = getMemberName();
    if (phoneEl) phoneEl.placeholder = 'Your mobile number';
  }
});

document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name    = document.getElementById('cName').value.trim();
  const email   = document.getElementById('cEmail').value.trim();
  const phone   = document.getElementById('cPhone') ? document.getElementById('cPhone').value.trim() : '';
  const message = document.getElementById('cMessage').value.trim();

  const success = document.getElementById('msgSuccess');
  const error   = document.getElementById('msgError');
  success.style.display = 'none';
  error.style.display   = 'none';

  // Validate
  if (!name)    { error.textContent = '⚠️ Please enter your name.';     error.style.display = 'block'; return; }
  if (!email)   { error.textContent = '⚠️ Please enter your email.';    error.style.display = 'block'; return; }
  if (!message) { error.textContent = '⚠️ Please enter your message.';  error.style.display = 'block'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error.textContent = '⚠️ Please enter a valid email address.';
    error.style.display = 'block'; return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled    = true;
  btn.textContent = '📩 Sending…';

  try {
    // FIX: Actually sends email to hanumansangamu@gmail.com via backend
    const result = await apiFetch('/auth/contact', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, message })
    });

    success.style.display = 'block';
    document.getElementById('contactForm').reset();
    showToast('✅ Message sent to admin!', 'success');

  } catch (err) {
    error.textContent   = '❌ Failed to send: ' + err.message;
    error.style.display = 'block';
    showToast('❌ Could not send message.', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = '📩 Send Message';
  }
});
