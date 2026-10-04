// Aplica o tema salvo antes do React carregar, para quem usa o claro não ver a tela piscar
// em escuro. Arquivo externo (e não <script> inline) porque a CSP só permite scripts da origem.
try {
  if (localStorage.getItem('familyctrl.tema') === 'claro') {
    document.documentElement.dataset.theme = 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#FAFAFA');
  }
} catch {
  // storage indisponível: fica no tema escuro
}
