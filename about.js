// about.js

document.addEventListener('DOMContentLoaded', () => {
  // Set username in navbar
  const navUser = document.getElementById('navUser');
  if (navUser) navUser.textContent = getMemberName() || 'Welcome';

  // Fade in Hanuman background image after load
  const img = document.querySelector('.hanuman-bg-img');
  if (img) {
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'));
    }
  }
});
