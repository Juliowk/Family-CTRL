import type { ButtonHTMLAttributes } from 'react';
import estilos from './Botao.module.css';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  carregando?: boolean;
  larguraTotal?: boolean;
  pequeno?: boolean;
}

export function Botao({
  variante = 'secundario',
  carregando = false,
  larguraTotal = false,
  pequeno = false,
  disabled,
  className,
  type = 'button',
  children,
  ...resto
}: Props) {
  const classes = [
    estilos.botao,
    estilos[variante],
    larguraTotal && estilos.larguraTotal,
    pequeno && estilos.pequeno,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando && <span className={estilos.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}
