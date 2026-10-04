import type { ReactNode } from 'react';
import estilos from './Selo.module.css';

type Tom = 'destaque' | 'neutro' | 'sucesso' | 'atencao';

/**
 * Selo em pílula para estados e papéis ("Atual", "ADMIN", "Concluída").
 * Com `ponto`, o estado também é indicado por forma, não só por cor.
 */
export function Selo({
  tom = 'neutro',
  ponto = false,
  children,
}: {
  tom?: Tom;
  ponto?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={[estilos.selo, estilos[tom]].join(' ')}>
      {ponto && <span className={estilos.ponto} aria-hidden="true" />}
      {children}
    </span>
  );
}
