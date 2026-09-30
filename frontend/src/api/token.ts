/**
 * Guarda o JWT no localStorage. O acesso é protegido por try/catch porque o storage pode
 * estar indisponível (modo privado de alguns navegadores, por exemplo).
 */
const CHAVE_TOKEN = 'familyctrl.token';

export function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

export function salvarToken(token: string): void {
  try {
    localStorage.setItem(CHAVE_TOKEN, token);
  } catch {
    // Sem storage o usuário continua logado só enquanto a aba estiver aberta
  }
}

export function limparToken(): void {
  try {
    localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // nada a fazer
  }
}
