import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tema da interface. O escuro é o padrão (identidade da marca); a escolha do claro fica no
 * localStorage. O public/tema.js aplica o tema salvo antes do React carregar (evita piscar).
 * De propósito, não seguimos o prefers-color-scheme do sistema (ver docs/marca.md).
 */
export type Tema = 'claro' | 'escuro';

const CHAVE = 'familyctrl.tema';
const COR_BARRA: Record<Tema, string> = { claro: '#FAFAFA', escuro: '#0F0F14' };
const ouvintes = new Set<() => void>();

function ler(): Tema {
  try {
    return localStorage.getItem(CHAVE) === 'claro' ? 'claro' : 'escuro';
  } catch {
    return 'escuro';
  }
}

/** Reflete o tema no <html> (data-theme) e na cor da barra do navegador no celular. */
export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement;
  if (tema === 'claro') raiz.dataset.theme = 'light';
  else delete raiz.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[tema]);
}

export function definirTema(tema: Tema): void {
  try {
    if (tema === 'claro') localStorage.setItem(CHAVE, 'claro');
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
  const tema = useSyncExternalStore(assinar, ler, () => 'escuro' as const);
  const definir = useCallback((novo: Tema) => definirTema(novo), []);
  return [tema, definir];
}
