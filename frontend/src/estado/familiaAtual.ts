import { useCallback, useSyncExternalStore } from 'react';

/**
 * Família selecionada pelo usuário (quem participa de várias alterna entre elas).
 * Fica no localStorage para o app abrir direto na última família usada.
 */
const CHAVE = 'familyctrl.familiaAtual';
const ouvintes = new Set<() => void>();

function ler(): number | null {
  try {
    const valor = localStorage.getItem(CHAVE);
    return valor ? Number(valor) : null;
  } catch {
    return null;
  }
}

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function definirFamiliaAtual(id: number): void {
  try {
    localStorage.setItem(CHAVE, String(id));
  } catch {
    // ignora storage indisponível
  }
  avisar();
}

export function esquecerFamiliaAtual(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // ignora storage indisponível
  }
  avisar();
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function useFamiliaAtual(): [number | null, (id: number) => void] {
  const atual = useSyncExternalStore(assinar, ler, () => null);
  const definir = useCallback((id: number) => definirFamiliaAtual(id), []);
  return [atual, definir];
}
