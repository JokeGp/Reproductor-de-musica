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
    // Login exitoso - guardar sesión y redireccionar
    sessionStorage.setItem('logged_in', 'true');
    window.location.href = '../Reproductor/index.html';
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
