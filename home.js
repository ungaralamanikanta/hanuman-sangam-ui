// home.js
document.addEventListener('DOMContentLoaded', async () => {
  const navUser   = document.getElementById('navUser');
  const logoutBtn = document.querySelector('.btn-logout');

  if (navUser) {
    navUser.textContent = isLoggedIn()
      ? (getMemberName() || (isAdmin() ? 'Admin' : 'Member'))
      : 'Guest';
  }

  if (logoutBtn && !isLoggedIn()) {
    logoutBtn.style.display = 'none';
    const navRight = document.querySelector('.nav-right');
    if (navRight) navRight.innerHTML = '<a href="login.html" class="btn-login-nav">Login</a>';
  }

  // Load total collection — public endpoint, no token needed
  try {
    const stats = await apiFetch('/admin/stats');
    if (stats && stats.totalCollection != null) {
      document.getElementById('totalAmount').textContent = rupees(stats.totalCollection);
    }
  } catch (_) {
    document.getElementById('totalAmount').textContent = '₹0';
  }
});
