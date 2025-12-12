const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Credenciales hardcodeadas
const VALID_USERNAME = 'Dhave';
const VALID_PASSWORD = '123456';

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const username = usernameInput.value;
  const password = passwordInput.value;

  // Validar credenciales
  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    // Login exitoso - guardar sesión
    sessionStorage.setItem('logged_in', 'true');

    // Mostrar modal de carga
    const loadingModal = document.getElementById('loading-modal');
    if (loadingModal) {
      loadingModal.classList.remove('hidden');
      // Forzar reflow para que la transición de opacidad funcione
      void loadingModal.offsetWidth;
      loadingModal.classList.add('active');
    }

    // Redireccionar después de 4 segundos
    setTimeout(() => {
      window.location.href = '../Reproductor/index.html';
    }, 3000);
  } else {
    // Mostrar error
    errorMessage.classList.add('show');
    passwordInput.value = '';
    passwordInput.focus();

    // Ocultar error después de 3 segundos
    setTimeout(() => {
      errorMessage.classList.remove('show');
    }, 3000);
  }
});

// Verificar si ya está logueado
if (sessionStorage.getItem('logged_in') === 'true') {
  window.location.href = '../Reproductor/index.html';
}
