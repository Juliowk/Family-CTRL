import { useEffect, useState } from 'react';

/** Fica verdadeiro depois de `ms` milissegundos com `ativo` ligado. */
export function useDemorou(ativo: boolean, ms = 2500): boolean {
  const [demorou, setDemorou] = useState(false);
  useEffect(() => {
    if (!ativo) return;
    const timer = setTimeout(() => setDemorou(true), ms);
    return () => {
      clearTimeout(timer);
      setDemorou(false);
    };
  }, [ativo, ms]);
  return ativo && demorou;
}
