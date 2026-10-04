// Aplica o tema salvo antes do React carregar, para quem usa o escuro não ver a tela piscar
// em claro. Arquivo externo (e não <script> inline) porque a CSP só permite scripts da origem.
try {
  if (localStorage.getItem('familyctrl.tema') === 'escuro') {
    document.documentElement.dataset.theme = 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#070B1E');
  }
} catch {
  // storage indisponível: fica no tema claro
}
