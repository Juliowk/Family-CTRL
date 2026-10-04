import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tema da interface. O claro é o padrão; a escolha do escuro fica no localStorage.
 * O public/tema.js aplica o tema salvo antes do React carregar (evita piscar claro no escuro).
 */
export type Tema = 'claro' | 'escuro';

const CHAVE = 'familyctrl.tema';
const COR_BARRA: Record<Tema, string> = { claro: '#F6F8FC', escuro: '#070B1E' };
const ouvintes = new Set<() => void>();

function ler(): Tema {
  try {
    return localStorage.getItem(CHAVE) === 'escuro' ? 'escuro' : 'claro';
  } catch {
    return 'claro';
  }
}

/** Reflete o tema no <html> (data-theme) e na cor da barra do navegador no celular. */
export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement;
  if (tema === 'escuro') raiz.dataset.theme = 'dark';
  else delete raiz.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[tema]);
}

export function definirTema(tema: Tema): void {
  try {
    if (tema === 'escuro') localStorage.setItem(CHAVE, 'escuro');
    else localStorage.removeItem(CHAVE);
  } catch {
    // ignora storage indisponível: o tema vale só nesta visita
  }
  aplicarTema(tema);
  ouvintes.forEach((ouvinte) => ouvinte());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function useTema(): [Tema, (tema: Tema) => void] {
  const tema = useSyncExternalStore(assinar, ler, () => 'claro' as const);
  const definir = useCallback((novo: Tema) => definirTema(novo), []);
  return [tema, definir];
}
