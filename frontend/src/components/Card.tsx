import type { HTMLAttributes } from 'react';
import estilos from './Card.module.css';

/** Superfície com borda sutil para agrupar conteúdo. */
export function Card({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[estilos.card, className].filter(Boolean).join(' ')} {...resto} />;
}
