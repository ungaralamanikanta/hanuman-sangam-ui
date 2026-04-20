// about.js
document.addEventListener('DOMContentLoaded', () => {
  const navUser = document.getElementById('navUser');
  if (navUser) navUser.textContent = getMemberName() || 'Welcome';
});
